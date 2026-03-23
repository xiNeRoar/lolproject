/**
 * Ephemeral error reply helper.
 *
 * Discord's deferReply() locks public/ephemeral at call time. To show
 * errors ephemerally after a public defer:
 * 1. deleteReply() — removes "Bot is thinking..." indicator
 * 2. followUp({ ephemeral: true }) — only invoker sees the error
 *
 * Success path is unaffected — use editReply() as normal.
 */

import type { ChatInputCommandInteraction } from "discord.js";

export async function replyError(
  interaction: ChatInputCommandInteraction,
  message: string,
): Promise<void> {
  try {
    await interaction.deleteReply();
  } catch {
    // deleteReply may fail if reply was never sent — safe to ignore
  }
  try {
    await interaction.followUp({ content: message, ephemeral: true });
  } catch {
    // followUp may fail if interaction expired — nothing we can do
  }
}
