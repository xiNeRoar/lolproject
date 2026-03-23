/**
 * /stats [team|player] [name]
 *
 * Quick stats lookup in Discord.
 * - /stats team TeamName  → team ELO, W/L, recent 5 matches
 * - /stats player RiotId#TAG → KDA avg, champion pool top 3, teams
 * - No arguments → invoker's own stats
 * Spec: docs/BOT_SPEC.md → /stats
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import { db } from "../lib/db.js";
import { renderTeamCard } from "../lib/teamCardRenderer.js";
import { renderPlayerCard } from "../lib/playerCardRenderer.js";
import {
  playersTable,
  teamsTable,
  teamMembersTable,
  matchesTable,
  matchPlayersTable,
} from "@workspace/db";
import { eq, and, desc, count, avg, sum, sql } from "drizzle-orm";

const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://vclol.gg";

export const data = new SlashCommandBuilder()
  .setName("stats")
  .setDescription("Quick stats lookup.")
  .addStringOption((o) =>
    o
      .setName("type")
      .setDescription("Look up a team or player")
      .setRequired(false)
      .addChoices(
        { name: "team", value: "team" },
        { name: "player", value: "player" }
      )
  )
  .addStringOption((o) =>
    o
      .setName("name")
      .setDescription("Team name or RiotId#TAG (leave blank for your own stats)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const type = interaction.options.getString("type");
  const name = interaction.options.getString("name")?.trim();

  // No args → invoker's own stats
  if (!type && !name) {
    await showInvokerStats(interaction);
    return;
  }

  if (type === "team") {
    await showTeamStats(interaction, name ?? "");
  } else if (type === "player") {
    await showPlayerStats(interaction, name ?? "");
  } else {
    // type not specified but name given — try to detect
    await interaction.editReply(
      "❌ Please specify `team` or `player`. Example: `/stats team VancouverStorm` or `/stats player xiNe#NA1`."
    );
  }
}

// ── Team stats ────────────────────────────────────────────────────────────────

async function showTeamStats(
  interaction: ChatInputCommandInteraction,
  teamName: string
) {
  if (!teamName) {
    await interaction.editReply("❌ Please provide a team name. Example: `/stats team VancouverStorm`.");
    return;
  }

  const [team] = await db
    .select()
    .from(teamsTable)
    .where(sql`lower(${teamsTable.name}) = lower(${teamName})`)
    .limit(1);

  if (!team) {
    await interaction.editReply(`❌ Team **${teamName}** not found.`);
    return;
  }

  // Recent 5 matches
  const recentMatches = await db
    .select({
      id: matchesTable.id,
      sideAName: matchesTable.sideAName,
      sideBName: matchesTable.sideBName,
      winnerName: matchesTable.winnerName,
      createdAt: matchesTable.createdAt,
      teamAId: matchesTable.teamAId,
    })
    .from(matchesTable)
    .where(
      sql`(${matchesTable.teamAId} = ${team.id} OR ${matchesTable.teamBId} = ${team.id})`
    )
    .orderBy(desc(matchesTable.createdAt))
    .limit(5);

  const winRate =
    team.wins + team.losses > 0
      ? Math.round((team.wins / (team.wins + team.losses)) * 100)
      : null;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📊 ${team.name} [${team.tag}]`)
    .addFields(
      { name: "ELO", value: String(team.teamElo), inline: true },
      { name: "W/L", value: `${team.wins}W / ${team.losses}L`, inline: true },
      { name: "Win Rate", value: winRate != null ? `${winRate}%` : "—", inline: true }
    );

  if (recentMatches.length > 0) {
    const matchLines = recentMatches.map((m) => {
      const won = m.winnerName === (m.teamAId === team.id ? m.sideAName : m.sideBName);
      const opponent = m.teamAId === team.id ? m.sideBName : m.sideAName;
      const date = m.createdAt.toISOString().slice(0, 10);
      return `${won ? "✅" : "❌"} vs ${opponent} (${date})`;
    });
    embed.addFields({ name: "Recent Matches", value: matchLines.join("\n") });
  }

  const recentResults = recentMatches.map((m) =>
    m.winnerName === (m.teamAId === team.id ? m.sideAName : m.sideBName)
  );
  try {
    const imgBuf = await renderTeamCard({
      teamName: team.name, teamTag: team.tag, elo: team.teamElo,
      wins: team.wins, losses: team.losses, recentResults, platformUrl: PLATFORM_URL,
    });
    const att = new AttachmentBuilder(imgBuf, { name: "team-card.png" });
    embed.setImage("attachment://team-card.png");
    embed.spliceFields(0, embed.data.fields?.length ?? 0);
    embed.setFooter({ text: `${PLATFORM_URL}/teams/${team.id}` });
    await interaction.editReply({ embeds: [embed], files: [att] });
  } catch (err) {
    console.error("[stats] Team card render failed:", err);
    embed.setFooter({ text: `${PLATFORM_URL}/teams/${team.id}` });
    await interaction.editReply({ embeds: [embed] });
  }
}

// ── Player stats ──────────────────────────────────────────────────────────────

async function showPlayerStats(
  interaction: ChatInputCommandInteraction,
  riotId: string
) {
  if (!riotId) {
    await interaction.editReply("❌ Please provide a Riot ID. Example: `/stats player xiNe#NA1`.");
    return;
  }

  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.riotId, riotId))
    .limit(1);

  if (!player) {
    await interaction.editReply(`❌ Player **${riotId}** not found.`);
    return;
  }

  await buildPlayerEmbed(interaction, player);
}

// ── Invoker's own stats ────────────────────────────────────────────────────────

async function showInvokerStats(interaction: ChatInputCommandInteraction) {
  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.discordId, interaction.user.id))
    .limit(1);

  if (!player) {
    await interaction.editReply(
      "❌ You don't have a VCLoL profile yet. Ask a captain to `/add` you."
    );
    return;
  }

  await buildPlayerEmbed(interaction, player);
}

// ── Shared player embed builder ────────────────────────────────────────────────

async function buildPlayerEmbed(
  interaction: ChatInputCommandInteraction,
  player: typeof playersTable.$inferSelect
) {
  // Aggregate stats from match_players
  const [stats] = await db
    .select({
      totalGames: count(),
      wins: sum(sql<number>`CASE WHEN ${matchPlayersTable.win} THEN 1 ELSE 0 END`),
      avgKills: avg(matchPlayersTable.kills),
      avgDeaths: avg(matchPlayersTable.deaths),
      avgAssists: avg(matchPlayersTable.assists),
    })
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.playerId, player.id));

  const totalGames = Number(stats?.totalGames ?? 0);
  const wins = Number(stats?.wins ?? 0);
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : null;
  const avgK = Number(Number(stats?.avgKills ?? 0).toFixed(1));
  const avgD = Number(Number(stats?.avgDeaths ?? 0).toFixed(1));
  const avgA = Number(Number(stats?.avgAssists ?? 0).toFixed(1));

  // Top 3 champions
  const champRows = await db
    .select({
      champion: matchPlayersTable.champion,
      games: count(),
    })
    .from(matchPlayersTable)
    .where(
      and(
        eq(matchPlayersTable.playerId, player.id),
        sql`${matchPlayersTable.champion} IS NOT NULL`
      )
    )
    .groupBy(matchPlayersTable.champion)
    .orderBy(desc(count()))
    .limit(3);

  // Teams
  const teamRows = await db
    .select({ teamName: teamsTable.name, teamTag: teamsTable.tag, status: teamMembersTable.status })
    .from(teamMembersTable)
    .leftJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
    .where(eq(teamMembersTable.playerId, player.id))
    .orderBy(desc(teamMembersTable.joinedAt))
    .limit(3);

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`📊 ${player.riotId}`)
    .addFields(
      { name: "Games", value: String(totalGames), inline: true },
      { name: "Win Rate", value: winRate != null ? `${winRate}%` : "—", inline: true },
      { name: "Avg KDA", value: totalGames > 0 ? `${avgK}/${avgD}/${avgA}` : "—", inline: true }
    );

  if (champRows.length > 0) {
    embed.addFields({
      name: "Champion Pool",
      value: champRows.map((c) => `${c.champion} (${c.games}g)`).join(" · "),
      inline: false,
    });
  }

  if (teamRows.length > 0) {
    embed.addFields({
      name: "Teams",
      value: teamRows
        .map((t) => `${t.teamName} [${t.teamTag}]${t.status === "inactive" ? " *(inactive)*" : ""}`)
        .join("\n"),
      inline: false,
    });
  }

  try {
    const imgBuf = await renderPlayerCard({
      riotId: player.riotId, totalGames, winRate,
      avgKills: avgK, avgDeaths: avgD, avgAssists: avgA,
      champions: champRows.map((c) => ({ name: c.champion!, games: Number(c.games) })),
      teams: teamRows.map((t) => ({ name: t.teamName!, tag: t.teamTag!, active: t.status === "active" })),
      platformUrl: PLATFORM_URL,
    });
    const att = new AttachmentBuilder(imgBuf, { name: "player-card.png" });
    embed.setImage("attachment://player-card.png");
    embed.spliceFields(0, embed.data.fields?.length ?? 0);
    embed.setFooter({ text: `${PLATFORM_URL}/players/${player.id}` });
    await interaction.editReply({ embeds: [embed], files: [att] });
  } catch (err) {
    console.error("[stats] Player card render failed:", err);
    embed.setFooter({ text: `${PLATFORM_URL}/players/${player.id}` });
    await interaction.editReply({ embeds: [embed] });
  }
}
