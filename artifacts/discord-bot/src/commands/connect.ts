/**
 * /connect
 *
 * Sends a one-time RSO verification link. Player clicks → browser →
 * Discord OAuth + Riot RSO OAuth → verified.
 * Spec: docs/BOT_SPEC.md → /connect
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { randomUUID } from "crypto";
import { db } from "../lib/db.js";
import { replyError } from "../lib/replyError.js";
import { playersTable, authSessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://vclol.gg";
const TOKEN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

export const data = new SlashCommandBuilder()
  .setName("connect")
  .setDescription("Verify your Riot Account to unlock VCLoL features.");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const discordId = interaction.user.id;

  // ── Check if already verified ────────────────────────────────────────────
  const [existing] = await db
    .select({ puuid: playersTable.puuid })
    .from(playersTable)
    .where(eq(playersTable.discordId, discordId))
    .limit(1);

  if (existing?.puuid) {
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("✅ Already verified!")
      .setDescription("Your Riot Account is already connected. You're ready to go.");
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  // ── Generate token + session ─────────────────────────────────────────────
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

  await db.insert(authSessionsTable).values({
    token,
    discordId,
    expiresAt,
  });

  // ── Reply with link ──────────────────────────────────────────────────────
  const url = `${PLATFORM_URL}/connect?token=${token}`;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🔗 Verify your Riot Account")
    .setDescription(
      `Click the link below to connect your Riot Account:\n\n` +
      `**[${url}](${url})**\n\n` +
      `This link expires in 10 minutes.`
    )
    .setFooter({ text: "One-time verification — you only need to do this once." });

  await interaction.editReply({ embeds: [embed] });
}
