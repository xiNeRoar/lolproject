/**
 * /link-riot <RiotName#TAG>
 *
 * Links a Discord user's player record to their Riot account.
 * Retroactively claims any match_players rows with matching PUUID.
 * Spec: docs/BOT_SPEC.md → /link-riot
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { db } from "../lib/db.js";
import { replyError } from "../lib/replyError.js";
import { playersTable, matchPlayersTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("link-riot")
  .setDescription("Link your Riot account to your VCLoL profile.")
  .addStringOption((o) =>
    o
      .setName("riot-id")
      .setDescription("Your Riot ID (e.g. xiNe#NA1)")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const discordId = interaction.user.id;
  const rawInput = interaction.options.getString("riot-id", true).trim();

  // ── Parse RiotName#TAG ────────────────────────────────────────────────────
  const match = rawInput.match(/^(.+)#([A-Za-z0-9]{1,5})$/);
  if (!match) {
    await replyError(interaction, 
      "❌ Invalid format. Use `RiotName#TAG` (e.g. `xiNe#NA1`)."
    );
    return;
  }
  const [, gameName, tagLine] = match;
  if (gameName!.length > 16) {
    await replyError(interaction, "❌ Game name too long (max 16 characters).");
    return;
  }
  const riotId = `${gameName}#${tagLine}`;

  // ── Find invoker's player record ──────────────────────────────────────────
  const player = (
    await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.discordId, discordId))
      .limit(1)
  )[0];

  if (!player) {
    await replyError(interaction, 
      "❌ You don't have a player record yet. Ask a team captain to `/add` you first."
    );
    return;
  }

  // ── Check riotId not taken by a different player ──────────────────────────
  const conflict = (
    await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(eq(playersTable.riotId, riotId))
      .limit(1)
  )[0];

  if (conflict && conflict.id !== player.id) {
    await replyError(interaction, 
      "❌ This Riot ID is already linked to another player."
    );
    return;
  }

  // ── Validate via Riot API (if key is configured) ──────────────────────────
  let puuid: string | null = player.puuid ?? null;
  const apiKey = process.env.RIOT_API_KEY;

  if (apiKey) {
    try {
      const encodedName = encodeURIComponent(gameName!);
      const encodedTag = encodeURIComponent(tagLine!);
      const resp = await fetch(
        `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodedName}/${encodedTag}`,
        { headers: { "X-Riot-Token": apiKey } }
      );

      if (resp.status === 404) {
        await replyError(interaction, "❌ This Riot ID does not exist. Check spelling and try again.");
        return;
      }
      if (!resp.ok) {
        // API error — fall through to trust-based mode
        console.warn(`[link-riot] Riot API error ${resp.status} for ${riotId}`);
      } else {
        const data = await resp.json() as { puuid: string };
        puuid = data.puuid;
      }
    } catch (err) {
      console.warn("[link-riot] Riot API fetch failed:", err);
      // Continue in trust-based mode
    }
  } else {
    // Trust-based mode: no API key to verify ownership.
    // Log for admin audit — squatting risk until PUUID confirmed via .rofl.
    console.warn(`[link-riot] Trust-based claim: discordId=${discordId} claimed riotId=${riotId}`);
  }

  // ── Update player record ──────────────────────────────────────────────────
  await db
    .update(playersTable)
    .set({
      riotId,
      ...(puuid ? { puuid } : {}),
      updatedAt: new Date(),
    })
    .where(eq(playersTable.id, player.id));

  // ── Retroactive PUUID claim ───────────────────────────────────────────────
  let claimedCount = 0;
  if (puuid) {
    const result = await db
      .update(matchPlayersTable)
      .set({ playerId: player.id })
      .where(
        and(
          eq(matchPlayersTable.puuid, puuid),
          isNull(matchPlayersTable.playerId)
        )
      )
      .returning({ id: matchPlayersTable.id });
    claimedCount = result.length;
  }

  // ── Reply ─────────────────────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle("✅ Riot ID linked!")
    .addFields({ name: "Linked as", value: riotId, inline: true });

  if (claimedCount > 0) {
    embed.addFields({
      name: "📊 Stats claimed",
      value: `${claimedCount} match record${claimedCount === 1 ? "" : "s"} retroactively linked to your profile.`,
    });
  }

  if (!apiKey) {
    embed.addFields({
      name: "⚠️ Unverified — Trust-based mode",
      value:
        "Riot ID linked without API verification (no API key configured). " +
        "Your identity will be confirmed automatically from your next \`.rofl\` submission. " +
        "If this was a mistake or someone else claimed your ID, contact an admin.",
    });
  }

  await interaction.editReply({ embeds: [embed] });
}
