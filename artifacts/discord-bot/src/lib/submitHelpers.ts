/**
 * Submit command helper functions — display formatting.
 * Extracted from submit.ts for maintainability.
 */

import { EmbedBuilder } from "discord.js";
import { db } from "./db.js";
import { teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface PlayerDisplay {
  riotId: string;
  champion: string;
  kda: string;
  linked: boolean;
}

/** Build display name for a match side: "TeamName [TAG]" or first player name. */
export async function buildSideName(
  teamId: number | null,
  players: { riotIdGameName: string }[]
): Promise<string> {
  if (teamId) {
    const [team] = await db
      .select({ name: teamsTable.name, tag: teamsTable.tag })
      .from(teamsTable)
      .where(eq(teamsTable.id, teamId));
    if (team) return `${team.name} [${team.tag}]`;
  }
  return players[0]?.riotIdGameName ?? "Unknown";
}

/** Format milliseconds as "MM:SS". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Build the Discord embed for a match result. */
export function buildMatchEmbed(opts: {
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
}): EmbedBuilder {
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
