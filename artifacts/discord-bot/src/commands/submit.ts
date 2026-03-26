/**
 * /submit
 *
 * Core match recording command. User attaches a .rofl file.
 * Parses it, identifies both teams, records match + stats in a transaction.
 * Spec: docs/BOT_SPEC.md → /submit
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { db } from "../lib/db.js";
import { replyError } from "../lib/replyError.js";
import { renderScoreboard } from "../lib/scoreboardRenderer.js";
import type { ScoreboardPlayer } from "../lib/scoreboardRenderer.js";
import {
  matchesTable,
  matchPlayersTable,
  teamsTable,
  teamMembersTable,
  playersTable,
  playerBansTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, inArray, or, isNull, gt, desc } from "drizzle-orm";
import { parseRofl, RoflParseError } from "../lib/rofl-parser.js";
import { matchTeams } from "../lib/team-matcher.js";
import { checkBan } from "../lib/checkBan.js";

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

  // ── Ban check ──────────────────────────────────────────────────────────────
  const banReason = await checkBan(interaction.user.id);
  if (banReason) {
    await replyError(interaction, `❌ Your account is currently banned: ${banReason}`);
    return;
  }

  const attachment = interaction.options.getAttachment("replay", true);

  // ── 1. Validate file ────────────────────────────────────────────────────
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

  // ── 2. Download .rofl ───────────────────────────────────────────────────
  let roflBuffer: Buffer;
  try {
    const resp = await fetch(attachment.url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    roflBuffer = Buffer.from(await resp.arrayBuffer());
  } catch (err) {
    await replyError(interaction, "❌ Failed to download the replay file. Please try again.");
    return;
  }

  // ── 3. Parse .rofl ──────────────────────────────────────────────────────
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

  // ── 4. Duplicate check (same gameId) ───────────────────────────────────
  const existing = (
    await db
      .select({ id: matchesTable.id })
      .from(matchesTable)
      .where(eq(matchesTable.gameId, match.gameId))
      .limit(1)
  )[0];

  if (existing) {
    await replyError(interaction, 
      `❌ This match has already been submitted (Match #${existing.id}).`
    );
    return;
  }

  // ── 5. Ban check ────────────────────────────────────────────────────────
  const allPuuids = match.players.map((p) => p.puuid).filter(Boolean);
  const allRiotIds = match.players.map((p) => p.riotId).filter(Boolean);

  // Find player IDs for participants
  const participantPlayers = await db
    .select({ id: playersTable.id, riotId: playersTable.riotId })
    .from(playersTable)
    .where(
      or(
        allPuuids.length > 0 ? inArray(playersTable.puuid, allPuuids) : undefined,
        allRiotIds.length > 0 ? inArray(playersTable.riotId, allRiotIds) : undefined
      )
    );

  if (participantPlayers.length > 0) {
    const participantIds = participantPlayers.map((p) => p.id);
    const activeBan = (
      await db
        .select({ reason: playerBansTable.reason })
        .from(playerBansTable)
        .where(
          and(
            inArray(playerBansTable.playerId, participantIds),
            eq(playerBansTable.isActive, true),
            or(
              isNull(playerBansTable.expiresAt),          // permanent ban
              gt(playerBansTable.expiresAt, new Date()),  // temporary ban still active
            )
          )
        )
        .limit(1)
    )[0];

    if (activeBan) {
      await replyError(interaction, 
        `❌ A participant in this match is currently banned: ${activeBan.reason}`
      );
      return;
    }
  }

  // ── 6. Team matching ────────────────────────────────────────────────────
  const { sideA, sideB } = await matchTeams(match.blueSide, match.redSide);

  // ── 6a. Submitter membership check ──────────────────────────────────────
  // If at least one team was identified, verify the submitter is a member of
  // either team. Unregistered users may submit unregistered matches (stats-only).
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
        await replyError(interaction, 
          "❌ You can only submit replays for matches you participated in."
        );
        return;
      }
    }
    // invokerPlayer is null → unregistered user; block since a team was identified
    // (they could be maliciously submitting for a team they're not part of)
    else {
      await replyError(interaction, 
        "❌ You must be a registered team member to submit a match for an identified team. " +
        "Run `/connect` to verify your Riot Account first."
      );
      return;
    }
  }

  // ── 6b. Team ban check ───────────────────────────────────────────────────
  // Check if either identified team has an active team-level ban.
  const identifiedTeamIds = [sideA.teamId, sideB.teamId].filter((id): id is number => id !== null);
  if (identifiedTeamIds.length > 0) {
    const [teamBan] = await db
      .select({ reason: playerBansTable.reason })
      .from(playerBansTable)
      .where(
        and(
          inArray(playerBansTable.teamId, identifiedTeamIds),
          eq(playerBansTable.isActive, true),
          or(
            isNull(playerBansTable.expiresAt),
            gt(playerBansTable.expiresAt, new Date()),
          )
        )
      )
      .limit(1);

    if (teamBan) {
      await replyError(interaction, 
        `❌ A team in this match is currently banned: ${teamBan.reason}`
      );
      return;
    }
  }

  // ── 6c. Submit rate limit (2-minute cooldown per team) ──────────────────
  if (identifiedTeamIds.length > 0) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const [recentTeam] = await db
      .select({ id: teamsTable.id, name: teamsTable.name, lastMatchAt: teamsTable.lastMatchAt })
      .from(teamsTable)
      .where(
        and(
          inArray(teamsTable.id, identifiedTeamIds),
          gt(teamsTable.lastMatchAt, twoMinutesAgo)
        )
      )
      .limit(1);

    if (recentTeam && recentTeam.lastMatchAt) {
      const waitSeconds = Math.ceil((recentTeam.lastMatchAt.getTime() + 2 * 60 * 1000 - Date.now()) / 1000);
      await replyError(interaction, 
        `⏳ **${recentTeam.name}** submitted a match less than 2 minutes ago. Please wait ${waitSeconds}s before submitting again.`
      );
      return;
    }
  }

  // Determine winner side
  const blueWon = match.blueSide[0]?.win ?? false;

  // Build side names for display
  const sideAName = await buildSideName(sideA.teamId, match.blueSide);
  const sideBName = await buildSideName(sideB.teamId, match.redSide);
  const winnerName = blueWon ? sideAName : sideBName;

  // ── 7. Store .rofl file ─────────────────────────────────────────────────
  const uploadDir = process.env.ROFL_UPLOAD_DIR ?? "./uploads/rofl";
  const roflFilePath = join(uploadDir, `${match.gameId}.rofl`);
  try {
    mkdirSync(uploadDir, { recursive: true });
    writeFileSync(roflFilePath, roflBuffer);
  } catch (err) {
    console.error("[submit] Failed to store .rofl file:", err);
    // Non-fatal: proceed without file path
  }

  // ── 8. Record match in transaction ──────────────────────────────────────

  let matchId: number;

  try {
    await db.transaction(async (tx) => {
      // ELO calculation (only if both teams identified)
      // Fetch team settings (defaultMatchVisibility) for both sides
      const [teamA] = sideA.teamId
        ? await tx
            .select({ defaultMatchVisibility: teamsTable.defaultMatchVisibility })
            .from(teamsTable).where(eq(teamsTable.id, sideA.teamId))
        : [undefined];
      const [teamB] = sideB.teamId
        ? await tx
            .select({ defaultMatchVisibility: teamsTable.defaultMatchVisibility })
            .from(teamsTable).where(eq(teamsTable.id, sideB.teamId))
        : [undefined];

      // Create match row
      // Derive visibleAfter from team's defaultMatchVisibility setting.
      // v3.1: only public or private. Default for new teams is private.
      const resolvedVis = teamA?.defaultMatchVisibility ?? teamB?.defaultMatchVisibility ?? "private";
      const visibleAfter = resolvedVis === "public"
        ? new Date(0)                              // always public
        : new Date("9999-01-01T00:00:00Z");        // private (visible only to participants)
      const [createdMatch] = await tx
        .insert(matchesTable)
        .values({
          teamAId: sideA.teamId,
          teamBId: sideB.teamId,
          sideAName,
          sideBName,
          matchTitle: `${sideAName} vs ${sideBName}`,
          winnerName,
          score: "1-0",
          format: "BO1",
          gameId: match.gameId,
          gameDuration: match.gameLength,
          gameVersion: match.gameVersion,
          resultSource: "rofl_parse",
          roflFilePath: roflFilePath ?? null,
          visibleAfter,
        })
        .returning({ id: matchesTable.id });

      matchId = createdMatch!.id;

      // Create 10 match_players rows
      const allSidePlayers = [
        ...sideA.matchedPlayers.map((mp, i) => ({ mp, rofl: match.blueSide[i]!, side: "A" as const })),
        ...sideB.matchedPlayers.map((mp, i) => ({ mp, rofl: match.redSide[i]!, side: "B" as const })),
      ];

      await tx.insert(matchPlayersTable).values(
        allSidePlayers.map(({ mp, rofl, side }) => ({
          matchId,
          playerId: mp.playerId,
          teamSide: side,
          puuid: rofl.puuid,
          riotIdGameName: rofl.riotIdGameName,
          riotIdTagLine: rofl.riotIdTagLine,
          champion: rofl.champion,
          teamPosition: rofl.teamPosition,
          kills: rofl.kills,
          deaths: rofl.deaths,
          assists: rofl.assists,
          cs: rofl.cs,
          neutralCs: rofl.neutralCs,
          gold: rofl.gold,
          damageToChampions: rofl.damageToChampions,
          visionScore: rofl.visionScore,
          level: rofl.level,
          win: rofl.win,
          item0: rofl.item0,
          item1: rofl.item1,
          item2: rofl.item2,
          item3: rofl.item3,
          item4: rofl.item4,
          item5: rofl.item5,
          item6: rofl.item6,
          summonerSpell1: rofl.summonerSpell1,
          summonerSpell2: rofl.summonerSpell2,
        }))
      );

      // Update wins/losses + lastMatchAt (v3.1: no ELO for scrims)
      if (sideA.teamId && sideB.teamId) {
        const now = new Date();

        // Read current wins/losses for both teams, then update atomically
        const [teamARow] = await tx.select({ wins: teamsTable.wins, losses: teamsTable.losses })
          .from(teamsTable).where(eq(teamsTable.id, sideA.teamId));
        const [teamBRow] = await tx.select({ wins: teamsTable.wins, losses: teamsTable.losses })
          .from(teamsTable).where(eq(teamsTable.id, sideB.teamId));

        await tx.update(teamsTable).set({

          wins: blueWon ? (teamARow?.wins ?? 0) + 1 : (teamARow?.wins ?? 0),
          losses: !blueWon ? (teamARow?.losses ?? 0) + 1 : (teamARow?.losses ?? 0),
          lastMatchAt: now,
          updatedAt: now,
        }).where(eq(teamsTable.id, sideA.teamId));

        await tx.update(teamsTable).set({

          wins: !blueWon ? (teamBRow?.wins ?? 0) + 1 : (teamBRow?.wins ?? 0),
          losses: blueWon ? (teamBRow?.losses ?? 0) + 1 : (teamBRow?.losses ?? 0),
          lastMatchAt: now,
          updatedAt: now,
        }).where(eq(teamsTable.id, sideB.teamId));

      }

      // Create notification rows for all known players
      const knownPlayerIds = allSidePlayers
        .map(({ mp }) => mp.playerId)
        .filter((id): id is number => id !== null);

      if (knownPlayerIds.length > 0) {
        const duration = formatDuration(match.gameLength);
        await tx.insert(notificationsTable).values(
          knownPlayerIds.map((playerId) => ({
            playerId,
            type: "match_result",
            title: "Match recorded",
            message: `${sideAName} vs ${sideBName} — ${winnerName} won (${duration})`,
            entityId: matchId, // matchId is the DB integer assigned at tx time; match.id is undefined (RoflMatch has no .id)
            isRead: false,
            dmSent: false,
            dmFailed: false,
          }))
        );
      }
    });
  } catch (err) {
    // Unique constraint on gameId — concurrent submit of same .rofl
    if ((err as { code?: string }).code === "23505") {
      await replyError(interaction, 
        `❌ This match has already been submitted by another user.`
      );
      return;
    }
    console.error("[submit] Transaction error:", err);
    await replyError(interaction, "❌ Failed to record match. Please try again.");
    return;
  }

  // ── 9. Auto-inactive roster members (PRD §8) ───────────────────────────
  // Fire-and-forget: don't block reply. After match recorded, check each
  // identified team — members absent from last N matches → set inactive.
  if (identifiedTeamIds.length > 0) {
    checkRosterInactivity(identifiedTeamIds, matchId!).catch((err) =>
      console.error("[roster-inactivity] Check failed:", err)
    );

  }

  // ── 10. Build scoreboard data ────────────────────────────────────────────
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
        kills: r.kills,
        deaths: r.deaths,
        assists: r.assists,
        cs: r.cs + r.neutralCs,
        gold: r.gold,
        damage: r.damageToChampions,
        vision: r.visionScore,
        items: [r.item0 ?? 0, r.item1 ?? 0, r.item2 ?? 0, r.item3 ?? 0, r.item4 ?? 0, r.item5 ?? 0, r.item6 ?? 0],
        linked: mp.playerId !== null,
      };
    });

  const blueScoreboard = toScoreboardPlayers(sideA.matchedPlayers, match.blueSide);
  const redScoreboard = toScoreboardPlayers(sideB.matchedPlayers, match.redSide);

  // Build text embed (always — serves as fallback + embed title/description)
  const embed = buildMatchEmbed({
    matchId: matchId!,
    sideAName,
    sideBName,
    winnerName,
    blueWon,
    duration: durationStr,
    gameVersion: match.gameVersion,
    bluePlayers: blueScoreboard.map((p) => ({
      riotId: p.riotId,
      champion: p.champion,
      kda: `${p.kills}/${p.deaths}/${p.assists}`,
      linked: p.linked,
    })),
    redPlayers: redScoreboard.map((p) => ({
      riotId: p.riotId,
      champion: p.champion,
      kda: `${p.kills}/${p.deaths}/${p.assists}`,
      linked: p.linked,
    })),
    bothTeamsIdentified: !!(sideA.teamId && sideB.teamId),
  });

  // ── 10b. Render scoreboard image (fallback to text embed on failure) ────
  try {
    const imgBuffer = await renderScoreboard({
      matchId: matchId!,
      sideAName,
      sideBName,
      winnerName,
      blueWon,
      duration: durationStr,
      gameVersion: match.gameVersion,
      bluePlayers: blueScoreboard,
      redPlayers: redScoreboard,
        platformUrl,
    });

    const attachment = new AttachmentBuilder(imgBuffer, { name: "scoreboard.png" });
    embed.setImage("attachment://scoreboard.png");
    // Clear text player fields — image has full stats, text would be redundant
    embed.spliceFields(0, embed.data.fields?.length ?? 0);
    embed.setFooter({ text: `${platformUrl}/matches/${matchId!}` });

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  } catch (err) {
    console.error("[submit] Scoreboard image render failed, using text fallback:", err);
    embed.setFooter({ text: `${platformUrl}/matches/${matchId!}` });
    await interaction.editReply({ embeds: [embed] });
  }

  // ── 11. Interactive ✅/❌ buttons for unknown players (PRD §6.2) ──────────
  // For each side where a team was identified, show confirm/dismiss buttons
  // for match_players with playerId=null. Captain can add them to roster.
  interface UnknownPlayer {
    riotId: string;
    puuid: string;
    teamId: number;
    teamName: string;
  }

  const unknowns: UnknownPlayer[] = [];

  if (sideA.teamId) {
    for (const mp of sideA.matchedPlayers) {
      if (mp.playerId === null && mp.riotId && mp.puuid) {
        unknowns.push({ riotId: mp.riotId, puuid: mp.puuid, teamId: sideA.teamId, teamName: sideAName });
      }
    }
  }
  if (sideB.teamId) {
    for (const mp of sideB.matchedPlayers) {
      if (mp.playerId === null && mp.riotId && mp.puuid) {
        unknowns.push({ riotId: mp.riotId, puuid: mp.puuid, teamId: sideB.teamId, teamName: sideBName });
      }
    }
  }

  if (unknowns.length > 0) {
    const rows: ActionRowBuilder<ButtonBuilder>[] = [];
    for (let i = 0; i < unknowns.length && rows.length < 5; i++) {
      const u = unknowns[i]!;
      const shortName = u.riotId.length > 20 ? u.riotId.slice(0, 17) + "..." : u.riotId;
      rows.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`add_yes_${i}`)
            .setLabel(`Add ${shortName}`)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`add_no_${i}`)
            .setLabel("Skip")
            .setStyle(ButtonStyle.Secondary),
        )
      );
    }

    const followUp = await interaction.followUp({
      content: `**${unknowns.length} unknown player(s)** on identified team sides. Add them to rosters?`,
      components: rows,
    });

    const collector = followUp.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 5 * 60 * 1000, // 5 minutes
    });

    const handled = new Set<number>();

    collector.on("collect", async (btn) => {
      const parts = btn.customId.split("_");
      const action = parts[1]; // "yes" or "no"
      const idx = parseInt(parts[2] ?? "", 10);
      if (isNaN(idx) || idx >= unknowns.length || handled.has(idx)) {
        await btn.deferUpdate();
        return;
      }

      const u = unknowns[idx]!;

      // Only the captain of the relevant team can confirm
      const [invokerPlayer] = await db
        .select({ id: playersTable.id })
        .from(playersTable)
        .where(eq(playersTable.discordId, btn.user.id))
        .limit(1);

      if (!invokerPlayer) {
        await btn.reply({ content: "You don't have a VCLoL player record.", ephemeral: true });
        return;
      }

      const [captainCheck] = await db
        .select({ id: teamsTable.id })
        .from(teamsTable)
        .where(and(eq(teamsTable.id, u.teamId), eq(teamsTable.captainPlayerId, invokerPlayer.id)))
        .limit(1);

      if (!captainCheck) {
        await btn.reply({ content: "Only the team captain can confirm roster additions.", ephemeral: true });
        return;
      }

      handled.add(idx);

      if (action === "yes") {
        try {
          // Find or create player record
          let targetPlayer = (
            await db.select().from(playersTable).where(eq(playersTable.puuid, u.puuid)).limit(1)
          )[0];
          if (!targetPlayer) {
            targetPlayer = (
              await db.select().from(playersTable).where(eq(playersTable.riotId, u.riotId)).limit(1)
            )[0];
          }

          let playerId: number;
          if (targetPlayer) {
            playerId = targetPlayer.id;
            if (!targetPlayer.puuid && u.puuid) {
              await db.update(playersTable).set({ puuid: u.puuid }).where(eq(playersTable.id, playerId));
            }
          } else {
            const [created] = await db
              .insert(playersTable)
              .values({ riotId: u.riotId, discordUsername: u.riotId, discordId: null, puuid: u.puuid, registrationStatus: "active" })
              .returning();
            playerId = created!.id;
          }

          // Add to team as active (v3.1: .rofl auto-discovery, no invite needed)
          const [existingMember] = await db
            .select({ id: teamMembersTable.id })
            .from(teamMembersTable)
            .where(and(eq(teamMembersTable.teamId, u.teamId), eq(teamMembersTable.playerId, playerId)))
            .limit(1);

          if (!existingMember) {
            await db.insert(teamMembersTable)
              .values({ teamId: u.teamId, playerId, role: null, status: "active" });

            // DM notification if player has discordId (v3.1: auto-added, no invite needed)
            if (targetPlayer?.discordId) {
              try {
                const dmUser = await btn.client.users.fetch(targetPlayer.discordId);
                const [teamInfo] = await db.select({ name: teamsTable.name, tag: teamsTable.tag })
                  .from(teamsTable).where(eq(teamsTable.id, u.teamId)).limit(1);
                const tLabel = teamInfo ? `${teamInfo.name} [${teamInfo.tag}]` : u.teamName;
                const dmEmbed = new EmbedBuilder()
                  .setColor(0x57f287)
                  .setTitle(`Added to ${tLabel}`)
                  .setDescription(
                    `You were added to **${tLabel}** from a match replay.\n\n` +
                    `Run \`/connect\` to verify your Riot Account and claim your profile.`
                  )
                  .setFooter({ text: process.env.PLATFORM_URL ?? "https://vclol.gg" });
                await dmUser.send({ embeds: [dmEmbed] });
              } catch { /* DM failed — player can claim via website */ }
            }
          }

          // Link match_players row
          await db
            .update(matchPlayersTable)
            .set({ playerId })
            .where(and(eq(matchPlayersTable.matchId, matchId!), eq(matchPlayersTable.puuid, u.puuid)));

          await btn.update({ components: disableRow(rows, idx, `✅ ${u.riotId} added`) });
        } catch (err) {
          console.error(`[submit] Add unknown player ${u.riotId}:`, err);
          await btn.update({ components: disableRow(rows, idx, `❌ Failed`) });
        }
      } else {
        await btn.update({ components: disableRow(rows, idx, `Skipped ${u.riotId}`) });
      }
    });

    collector.on("end", async () => {
      try {
        const disabled = rows.map((row) => {
          const r = new ActionRowBuilder<ButtonBuilder>();
          for (const c of row.components) r.addComponents(ButtonBuilder.from(c).setDisabled(true));
          return r;
        });
        await followUp.edit({ components: disabled });
      } catch { /* message may be deleted */ }
    });
  }
}

/** Replace a button row at idx with a single disabled label. */
function disableRow(
  rows: ActionRowBuilder<ButtonBuilder>[],
  idx: number,
  label: string,
): ActionRowBuilder<ButtonBuilder>[] {
  return rows.map((row, i) =>
    i === idx
      ? new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`done_${idx}`).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(true),
        )
      : row
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildSideName(teamId: number | null, players: { riotIdGameName: string }[]): Promise<string> {
  if (teamId) {
    const [team] = await db
      .select({ name: teamsTable.name, tag: teamsTable.tag })
      .from(teamsTable)
      .where(eq(teamsTable.id, teamId));
    if (team) return `${team.name} [${team.tag}]`;
  }
  // Unregistered: use first player's name
  return players[0]?.riotIdGameName ?? "Unknown";
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface PlayerDisplay {
  riotId: string;
  champion: string;
  kda: string;
  linked: boolean;
}

function buildMatchEmbed(opts: {
  matchId: number;
  sideAName: string;
  sideBName: string;
  winnerName: string;
  blueWon: boolean;
  duration: string;
  gameVersion: string;
  bluePlayers: PlayerDisplay[];
  redPlayers: PlayerDisplay[];
  bothTeamsIdentified: boolean;
}) {
  const {
    matchId, sideAName, sideBName, winnerName, blueWon,
    duration, gameVersion, bluePlayers, redPlayers, bothTeamsIdentified,
  } = opts;

  const embed = new EmbedBuilder()
    .setColor(blueWon ? 0x5865f2 : 0xed4245)
    .setTitle(`✅ Match #${matchId} recorded`)
    .setDescription(
      `**${sideAName}** ${blueWon ? "🏆" : ""} vs ${!blueWon ? "🏆" : ""} **${sideBName}**\n` +
      `Duration: ${duration} | Patch: ${gameVersion}`
    );

  const formatPlayers = (players: PlayerDisplay[]) =>
    players
      .map((p) => `${p.linked ? "" : "⚠️"} ${p.champion} · ${p.kda} · ${p.riotId}`)
      .join("\n");

  embed.addFields(
    { name: `🔵 ${sideAName}`, value: formatPlayers(bluePlayers), inline: true },
    { name: `🔴 ${sideBName}`, value: formatPlayers(redPlayers), inline: true }
  );

  if (!bothTeamsIdentified) {
    const platformUrl = process.env.PLATFORM_URL ?? "https://vclol.gg";
    embed.addFields({
      name: "⚠️ Opponent not registered",
      value:
        "One or both teams aren't registered on VCLoL. Stats recorded.\n" +
        `Use \`/claim-match ${matchId}\` after registering to claim this match.\n` +
        `Invite them: ${platformUrl}`,
    });
  }

  const unlinked = [...bluePlayers, ...redPlayers].filter((p) => !p.linked);
  if (unlinked.length > 0) {
    embed.addFields({
      name: "⚠️ Unlinked players",
      value:
        `${unlinked.length} player(s) not linked to a VCLoL profile:\n` +
        unlinked.map((p) => `• ${p.riotId}`).join("\n") +
        "\nThey can use `/connect` to verify their account.",
    });
  }

  embed.setFooter({ text: `Match ID: ${matchId}` });

  return embed;
}

// ─── Roster inactivity check (PRD §8) ─────────────────────────────────────────

const INACTIVITY_THRESHOLD = 5; // consecutive match absences before auto-inactive

/**
 * After a match is submitted, check each team's active roster members.
 * If a member has been absent from the last N team matches, mark them inactive
 * and write a notification to the DB.
 */
async function checkRosterInactivity(teamIds: number[], currentMatchId: number): Promise<void> {
  for (const teamId of teamIds) {
    // Get last N match IDs for this team (including current)
    const recentMatches = await db
      .select({ id: matchesTable.id })
      .from(matchesTable)
      .where(
        or(
          eq(matchesTable.teamAId, teamId),
          eq(matchesTable.teamBId, teamId)
        )
      )
      .orderBy(desc(matchesTable.createdAt))
      .limit(INACTIVITY_THRESHOLD);

    if (recentMatches.length < INACTIVITY_THRESHOLD) continue; // not enough matches yet

    const recentMatchIds = recentMatches.map((m) => m.id);

    // Get active members of this team
    const activeMembers = await db
      .select({ playerId: teamMembersTable.playerId, membershipId: teamMembersTable.id })
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, teamId),
          eq(teamMembersTable.status, "active")
        )
      );

    for (const member of activeMembers) {
      // Check if member appeared in ANY of the last N matches
      const appearances = await db
        .select({ id: matchPlayersTable.id })
        .from(matchPlayersTable)
        .where(
          and(
            eq(matchPlayersTable.playerId, member.playerId),
            inArray(matchPlayersTable.matchId, recentMatchIds)
          )
        )
        .limit(1);

      if (appearances.length === 0) {
        // Member absent from all last N matches — mark inactive
        await db
          .update(teamMembersTable)
          .set({ status: "inactive" })
          .where(eq(teamMembersTable.id, member.membershipId));

        console.log(`[roster-inactivity] Player ${member.playerId} marked inactive on team ${teamId} (${INACTIVITY_THRESHOLD} consecutive absences)`);

        // Notify player via notifications table (poller handles DM delivery)
        await db.insert(notificationsTable).values({
          playerId: member.playerId,
          type: "no_show_flagged",
          title: "Roster status updated",
          message: `You have been marked inactive on your team after missing ${INACTIVITY_THRESHOLD} consecutive matches. Submit a new match or contact your captain to rejoin.`,
          isRead: false,
          dmSent: false,
          dmFailed: false,
        });
      }
    }
  }
}
