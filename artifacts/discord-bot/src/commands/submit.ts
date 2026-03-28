/**
 * /submit — Core match recording command.
 *
 * User attaches a .rofl file. This orchestrator validates input, then delegates
 * to focused modules: matchRecorder (DB transaction), submitHelpers (display),
 * unknownPlayerHandler (interactive buttons), rosterInactivity (post-match check).
 *
 * Spec: docs/BOT_SPEC.md → /submit
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { db } from "../lib/db.js";
import { replyError } from "../lib/replyError.js";
import { renderScoreboard } from "../lib/scoreboardRenderer.js";
import type { ScoreboardPlayer } from "../lib/scoreboardRenderer.js";
import {
  matchesTable,
  teamsTable,
  teamMembersTable,
  playersTable,
  playerBansTable,
} from "@workspace/db";
import { eq, and, inArray, or, isNull, gt } from "drizzle-orm";
import { parseRofl, RoflParseError } from "../lib/rofl-parser.js";
import { matchTeams } from "../lib/team-matcher.js";
import { checkBan } from "../lib/checkBan.js";
import { recordMatch } from "../lib/matchRecorder.js";
import { buildSideName, formatDuration, buildMatchEmbed } from "../lib/submitHelpers.js";
import { handleUnknownPlayers, type UnknownPlayer } from "../lib/unknownPlayerHandler.js";
import { checkRosterInactivity } from "../lib/rosterInactivity.js";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

export const data = new SlashCommandBuilder()
  .setName("submit")
  .setDescription("Submit a .rofl replay file to record a match result.")
  .addAttachmentOption((o) =>
    o.setName("replay").setDescription("Your .rofl replay file").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // ── Guild-only guard ────────────────────────────────────────────────────
  if (!interaction.inGuild()) {
    await replyError(interaction, "❌ This command can only be used in a Discord server, not in DMs.");
    return;
  }

  // ── Ban check ──────────────────────────────────────────────────────────
  const banReason = await checkBan(interaction.user.id);
  if (banReason) {
    await replyError(interaction, `❌ Your account is currently banned: ${banReason}`);
    return;
  }

  const attachment = interaction.options.getAttachment("replay", true);

  // ── 1. Validate file ──────────────────────────────────────────────────
  if (!attachment.name?.endsWith(".rofl")) {
    await replyError(interaction, "❌ Please attach a `.rofl` replay file.");
    return;
  }
  if (attachment.size > MAX_FILE_SIZE) {
    const sizeMB = (attachment.size / 1024 / 1024).toFixed(1);
    const apiBase = process.env.PLATFORM_URL ?? "https://vclol.gg";
    await replyError(interaction,
      `❌ Replay file too large (${sizeMB} MB). Discord's default limit is 8 MB.\n\n` +
      `**Upload directly to VCLoL instead:**\n` +
      `\`\`\`\ncurl -X POST ${apiBase}/api/matches/submit-rofl \\\n` +
      `  --data-binary @${attachment.name} \\\n` +
      `  -H "Content-Type: application/octet-stream" \\\n` +
      `  -H "X-Discord-Id: ${interaction.user.id}"\n\`\`\``
    );
    return;
  }

  // ── 2. Download .rofl ─────────────────────────────────────────────────
  let roflBuffer: Buffer;
  try {
    const resp = await fetch(attachment.url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    roflBuffer = Buffer.from(await resp.arrayBuffer());
  } catch {
    await replyError(interaction, "❌ Failed to download the replay file. Please try again.");
    return;
  }

  // ── 3. Parse .rofl ────────────────────────────────────────────────────
  let match: Awaited<ReturnType<typeof parseRofl>>;
  try {
    match = parseRofl(roflBuffer);
  } catch (err) {
    if (err instanceof RoflParseError) {
      await replyError(interaction, `❌ ${err.message}`);
    } else {
      await replyError(interaction, "❌ Could not read the replay file. Is it a valid .rofl?");
    }
    return;
  }

  // ── 4. Duplicate check ────────────────────────────────────────────────
  const [existing] = await db
    .select({ id: matchesTable.id })
    .from(matchesTable)
    .where(eq(matchesTable.gameId, match.gameId))
    .limit(1);

  if (existing) {
    await replyError(interaction, `❌ This match has already been submitted (Match #${existing.id}).`);
    return;
  }

  // ── 5. Participant ban check ──────────────────────────────────────────
  const allPuuids = match.players.map((p) => p.puuid).filter(Boolean);
  const allRiotIds = match.players.map((p) => p.riotId).filter(Boolean);

  const participantPlayers = await db
    .select({ id: playersTable.id })
    .from(playersTable)
    .where(
      or(
        allPuuids.length > 0 ? inArray(playersTable.puuid, allPuuids) : undefined,
        allRiotIds.length > 0 ? inArray(playersTable.riotId, allRiotIds) : undefined
      )
    );

  if (participantPlayers.length > 0) {
    const [activeBan] = await db
      .select({ reason: playerBansTable.reason })
      .from(playerBansTable)
      .where(
        and(
          inArray(playerBansTable.playerId, participantPlayers.map((p) => p.id)),
          eq(playerBansTable.isActive, true),
          or(isNull(playerBansTable.expiresAt), gt(playerBansTable.expiresAt, new Date()))
        )
      )
      .limit(1);

    if (activeBan) {
      await replyError(interaction, `❌ A participant in this match is currently banned: ${activeBan.reason}`);
      return;
    }
  }

  // ── 6. Team matching ──────────────────────────────────────────────────
  const { sideA, sideB } = await matchTeams(match.blueSide, match.redSide);

  // ── 6a. Submitter membership check ────────────────────────────────────
  if (sideA.teamId || sideB.teamId) {
    const [invokerPlayer] = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(eq(playersTable.discordId, interaction.user.id))
      .limit(1);

    if (invokerPlayer) {
      const teamIds = [sideA.teamId, sideB.teamId].filter((id): id is number => id !== null);
      const [membership] = await db
        .select({ id: teamMembersTable.id })
        .from(teamMembersTable)
        .where(
          and(
            eq(teamMembersTable.playerId, invokerPlayer.id),
            eq(teamMembersTable.status, "active"),
            inArray(teamMembersTable.teamId, teamIds)
          )
        )
        .limit(1);

      if (!membership) {
        await replyError(interaction, "❌ You can only submit replays for matches you participated in.");
        return;
      }
    } else {
      await replyError(interaction,
        "❌ You must be a registered team member to submit a match for an identified team. " +
        "Run `/connect` to verify your Riot Account first."
      );
      return;
    }
  }

  // ── 6b. Team ban check ────────────────────────────────────────────────
  const identifiedTeamIds = [sideA.teamId, sideB.teamId].filter((id): id is number => id !== null);
  if (identifiedTeamIds.length > 0) {
    const [teamBan] = await db
      .select({ reason: playerBansTable.reason })
      .from(playerBansTable)
      .where(
        and(
          inArray(playerBansTable.teamId, identifiedTeamIds),
          eq(playerBansTable.isActive, true),
          or(isNull(playerBansTable.expiresAt), gt(playerBansTable.expiresAt, new Date()))
        )
      )
      .limit(1);

    if (teamBan) {
      await replyError(interaction, `❌ A team in this match is currently banned: ${teamBan.reason}`);
      return;
    }
  }

  // ── 6c. Rate limit (2-minute cooldown per team) ───────────────────────
  if (identifiedTeamIds.length > 0) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const [recentTeam] = await db
      .select({ id: teamsTable.id, name: teamsTable.name, lastMatchAt: teamsTable.lastMatchAt })
      .from(teamsTable)
      .where(and(inArray(teamsTable.id, identifiedTeamIds), gt(teamsTable.lastMatchAt, twoMinutesAgo)))
      .limit(1);

    if (recentTeam?.lastMatchAt) {
      const waitSeconds = Math.ceil((recentTeam.lastMatchAt.getTime() + 2 * 60 * 1000 - Date.now()) / 1000);
      await replyError(interaction,
        `⏳ **${recentTeam.name}** submitted a match less than 2 minutes ago. Please wait ${waitSeconds}s.`
      );
      return;
    }
  }

  // ── Derived values ────────────────────────────────────────────────────
  const blueWon = match.blueSide[0]?.win ?? false;
  const sideAName = await buildSideName(sideA.teamId, match.blueSide);
  const sideBName = await buildSideName(sideB.teamId, match.redSide);
  const winnerName = blueWon ? sideAName : sideBName;

  // ── 7. Store .rofl file ───────────────────────────────────────────────
  const uploadDir = process.env.ROFL_UPLOAD_DIR ?? "./uploads/rofl";
  let roflFilePath: string | null = join(uploadDir, `${match.gameId}.rofl`);
  try {
    mkdirSync(uploadDir, { recursive: true });
    writeFileSync(roflFilePath, roflBuffer);
  } catch (err) {
    console.error("[submit] Failed to store .rofl file:", err);
    roflFilePath = null;
  }

  // ── 8. Record match (DB transaction) ──────────────────────────────────
  let matchId: number;
  try {
    matchId = await recordMatch({ match, sideA, sideB, sideAName, sideBName, winnerName, blueWon, roflFilePath });
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      await replyError(interaction, "❌ This match has already been submitted by another user.");
      return;
    }
    console.error("[submit] Transaction error:", err);
    await replyError(interaction, "❌ Failed to record match. Please try again.");
    return;
  }

  // ── 9. Roster inactivity (fire-and-forget) ────────────────────────────
  if (identifiedTeamIds.length > 0) {
    checkRosterInactivity(identifiedTeamIds, matchId).catch((err) =>
      console.error("[submit] Roster inactivity check failed:", err)
    );
  }

  // ── 10. Build + send scoreboard ───────────────────────────────────────
  const platformUrl = process.env.PLATFORM_URL ?? "https://vclol.gg";
  const durationStr = formatDuration(match.gameLength);

  const toScoreboardPlayers = (
    matchedPlayers: typeof sideA.matchedPlayers,
    roflPlayers: typeof match.blueSide,
  ): ScoreboardPlayer[] =>
    matchedPlayers.map((mp, i) => {
      const r = roflPlayers[i]!;
      return {
        riotId: mp.riotId,
        champion: r.champion,
        kills: r.kills, deaths: r.deaths, assists: r.assists,
        cs: r.cs + r.neutralCs, gold: r.gold,
        damage: r.damageToChampions, vision: r.visionScore,
        items: [r.item0 ?? 0, r.item1 ?? 0, r.item2 ?? 0, r.item3 ?? 0, r.item4 ?? 0, r.item5 ?? 0, r.item6 ?? 0],
        linked: mp.playerId !== null,
      };
    });

  const blueScoreboard = toScoreboardPlayers(sideA.matchedPlayers, match.blueSide);
  const redScoreboard = toScoreboardPlayers(sideB.matchedPlayers, match.redSide);

  const embed = buildMatchEmbed({
    matchId, sideAName, sideBName, winnerName, blueWon,
    duration: durationStr, gameVersion: match.gameVersion,
    bluePlayers: blueScoreboard.map((p) => ({
      riotId: p.riotId, champion: p.champion,
      kda: `${p.kills}/${p.deaths}/${p.assists}`, linked: p.linked,
    })),
    redPlayers: redScoreboard.map((p) => ({
      riotId: p.riotId, champion: p.champion,
      kda: `${p.kills}/${p.deaths}/${p.assists}`, linked: p.linked,
    })),
    bothTeamsIdentified: !!(sideA.teamId && sideB.teamId),
  });

  try {
    const imgBuffer = await renderScoreboard({
      matchId, sideAName, sideBName, winnerName, blueWon,
      duration: durationStr, gameVersion: match.gameVersion,
      bluePlayers: blueScoreboard, redPlayers: redScoreboard, platformUrl,
    });
    const attachment = new AttachmentBuilder(imgBuffer, { name: "scoreboard.png" });
    embed.setImage("attachment://scoreboard.png");
    embed.spliceFields(0, embed.data.fields?.length ?? 0);
    embed.setFooter({ text: `${platformUrl}/matches/${matchId}` });
    await interaction.editReply({ embeds: [embed], files: [attachment] });
  } catch (err) {
    console.error("[submit] Scoreboard render failed, using text fallback:", err);
    embed.setFooter({ text: `${platformUrl}/matches/${matchId}` });
    await interaction.editReply({ embeds: [embed] });
  }

  // ── 11. Unknown player buttons (fire-and-forget) ──────────────────────
  const unknowns: UnknownPlayer[] = [];
  for (const side of [{ s: sideA, name: sideAName }, { s: sideB, name: sideBName }]) {
    if (!side.s.teamId) continue;
    for (const mp of side.s.matchedPlayers) {
      if (mp.playerId === null && mp.riotId && mp.puuid) {
        unknowns.push({ riotId: mp.riotId, puuid: mp.puuid, teamId: side.s.teamId, teamName: side.name });
      }
    }
  }

  handleUnknownPlayers(interaction, unknowns, matchId).catch((err) =>
    console.error("[submit] Unknown player handler failed:", err)
  );
}
