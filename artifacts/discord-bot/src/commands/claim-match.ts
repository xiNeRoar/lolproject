/**
 * /claim-match <matchId>
 *
 * Captain claims their team for an unregistered side of a match.
 * Updates W/L when both sides become known.
 * Spec: docs/BOT_SPEC.md → /claim-match
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
} from "discord.js";
import { db } from "../lib/db.js";
import { replyError } from "../lib/replyError.js";
import {
  matchesTable,
  matchPlayersTable,
  teamMembersTable,
  playersTable,
  teamsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { checkBan } from "../lib/checkBan.js";

export const data = new SlashCommandBuilder()
  .setName("claim-match")
  .setDescription("Claim an unregistered side of a recorded match for your team.")
  .addIntegerOption((o) =>
    o.setName("match-id").setDescription("Match ID to claim").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // ── Ban check ──────────────────────────────────────────────────────────────
  const banReason = await checkBan(interaction.user.id);
  if (banReason) {
    await replyError(interaction, `❌ Your account is currently banned: ${banReason}`);
    return;
  }


  const matchId = interaction.options.getInteger("match-id", true);
  const discordId = interaction.user.id;

  // ── Find invoker's player record ─────────────────────────────────────────
  const invoker = (
    await db.select().from(playersTable).where(eq(playersTable.discordId, discordId)).limit(1)
  )[0];

  if (!invoker) {
    await replyError(interaction, "❌ You don't have a player record. Ask a captain to `/add` you.");
    return;
  }

  // ── Find teams where invoker is captain ──────────────────────────────────
  const captainTeams = await db
    .select({ id: teamsTable.id, name: teamsTable.name, tag: teamsTable.tag })
    .from(teamsTable)
    .where(and(eq(teamsTable.captainPlayerId, invoker.id), eq(teamsTable.isActive, true)));

  if (captainTeams.length === 0) {
    await replyError(interaction, "❌ You are not the captain of any active team.");
    return;
  }

  // ── Find the match ────────────────────────────────────────────────────────
  const [match] = await db
    .select()
    .from(matchesTable)
    .where(eq(matchesTable.id, matchId));

  if (!match) {
    await replyError(interaction, `❌ Match #${matchId} not found.`);
    return;
  }

  // ── Check there's an unregistered side ───────────────────────────────────
  const hasNullA = match.teamAId === null;
  const hasNullB = match.teamBId === null;

  if (!hasNullA && !hasNullB) {
    await replyError(interaction, "❌ This match already has both teams assigned.");
    return;
  }

  // ── Determine which team to claim with ───────────────────────────────────
  let claimTeamId: number;
  let claimTeamName: string;
  let claimTeamTag: string;

  if (captainTeams.length === 1) {
    claimTeamId = captainTeams[0]!.id;
    claimTeamName = captainTeams[0]!.name;
    claimTeamTag = captainTeams[0]!.tag;
  } else {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("claim_team_select")
      .setPlaceholder("Which team is claiming this match?")
      .addOptions(captainTeams.map((t) => ({ label: `${t.name} [${t.tag}]`, value: String(t.id) })));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    const reply = await interaction.editReply({ content: "Which team is claiming this match?", components: [row] });

    try {
      const sel = await reply.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: (i: StringSelectMenuInteraction) => i.user.id === discordId,
        time: 30_000,
      });
      await sel.deferUpdate();
      const chosen = captainTeams.find((t) => String(t.id) === sel.values[0]);
      if (!chosen) { await replyError(interaction, { content: "❌ Invalid selection.", components: [] }); return; }
      claimTeamId = chosen.id;
      claimTeamName = chosen.name;
      claimTeamTag = chosen.tag;
    } catch {
      await replyError(interaction, { content: "❌ Timed out.", components: [] });
      return;
    }
  }

  // ── Get team members' PUUIDs ──────────────────────────────────────────────
  const members = await db
    .select({ puuid: playersTable.puuid, playerId: playersTable.id })
    .from(teamMembersTable)
    .innerJoin(playersTable, eq(teamMembersTable.playerId, playersTable.id))
    .where(and(eq(teamMembersTable.teamId, claimTeamId), eq(teamMembersTable.status, "active")));

  const memberPuuids = members.map((m) => m.puuid).filter((p): p is string => Boolean(p));

  // ── Count PUUID matches in the unclaimed side ─────────────────────────────
  const unclaimedSide = hasNullA ? "A" : "B";
  const matchPlayers = await db
    .select({ puuid: matchPlayersTable.puuid })
    .from(matchPlayersTable)
    .where(and(
      eq(matchPlayersTable.matchId, matchId),
      eq(matchPlayersTable.teamSide, unclaimedSide)
    ));

  const matchPuuids = matchPlayers.map((mp) => mp.puuid).filter(Boolean);
  const overlap = memberPuuids.filter((p) => matchPuuids.includes(p));

  if (overlap.length < 3) {
    await replyError(interaction, 
      `❌ Your team only matches ${overlap.length}/5 players on the unclaimed side (need 3+). ` +
      `Make sure your team members have run \`/link-riot\`.`
    );
    return;
  }

  // ── Assign team to unclaimed side + update display names ────────────────
  const claimDisplayName = `${claimTeamName} [${claimTeamTag}]`;

  // Update side name, matchTitle, and winnerName if the claimed side was the winner
  const newSideAName = hasNullA ? claimDisplayName : match.sideAName;
  const newSideBName = hasNullB ? claimDisplayName : match.sideBName;
  const newMatchTitle = `${newSideAName} vs ${newSideBName}`;

  // If the winning side was the unclaimed side, update winnerName too
  let newWinnerName = match.winnerName;
  if (hasNullA && match.winnerName === match.sideAName) {
    newWinnerName = claimDisplayName;
  } else if (hasNullB && match.winnerName === match.sideBName) {
    newWinnerName = claimDisplayName;
  }

  const sideUpdate = hasNullA
    ? { teamAId: claimTeamId, sideAName: claimDisplayName }
    : { teamBId: claimTeamId, sideBName: claimDisplayName };

  await db.update(matchesTable).set({
    ...sideUpdate,
    matchTitle: newMatchTitle,
    winnerName: newWinnerName,
    updatedAt: new Date(),
  }).where(eq(matchesTable.id, matchId));

  // ── Update W/L for both sides if both now known (v3.1: no ELO for scrims) ──
  const updatedTeamAId = hasNullA ? claimTeamId : match.teamAId!;
  const updatedTeamBId = hasNullB ? claimTeamId : match.teamBId!;

  if (updatedTeamAId && updatedTeamBId) {
    const blueWon = match.winnerName === match.sideAName;
    const teamAWon = blueWon;
    const now = new Date();

    const [teamARow] = await db.select({ wins: teamsTable.wins, losses: teamsTable.losses })
      .from(teamsTable).where(eq(teamsTable.id, updatedTeamAId));
    const [teamBRow] = await db.select({ wins: teamsTable.wins, losses: teamsTable.losses })
      .from(teamsTable).where(eq(teamsTable.id, updatedTeamBId));

    await db.update(teamsTable).set({
      wins: teamAWon ? (teamARow?.wins ?? 0) + 1 : (teamARow?.wins ?? 0),
      losses: !teamAWon ? (teamARow?.losses ?? 0) + 1 : (teamARow?.losses ?? 0),
      lastMatchAt: now, updatedAt: now,
    }).where(eq(teamsTable.id, updatedTeamAId));

    await db.update(teamsTable).set({
      wins: !teamAWon ? (teamBRow?.wins ?? 0) + 1 : (teamBRow?.wins ?? 0),
      losses: teamAWon ? (teamBRow?.losses ?? 0) + 1 : (teamBRow?.losses ?? 0),
      lastMatchAt: now, updatedAt: now,
    }).where(eq(teamsTable.id, updatedTeamBId));
  }

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`✅ Match #${matchId} claimed`)
    .setDescription(
      `**${claimTeamName} [${claimTeamTag}]** claimed the ${unclaimedSide === "A" ? "blue" : "red"} side.` +
      (updatedTeamAId && updatedTeamBId ? "\n\nW/L records updated for both teams." : "")
    );

  await interaction.editReply({ embeds: [embed], components: [] });
}
