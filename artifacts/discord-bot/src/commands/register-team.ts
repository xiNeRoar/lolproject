/**
 * /register-team <name> <tag>
 *
 * Creates a new team. The invoking Discord user becomes the captain.
 * Spec: docs/BOT_SPEC.md → /register-team
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { db } from "../lib/db.js";
import {
  teamsTable,
  teamMembersTable,
  playersTable,
  eloHistoryTable,
} from "@workspace/db";
import { eq, and, gt, count } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("register-team")
  .setDescription("Create a new team. You become the captain.")
  .addStringOption((o) =>
    o.setName("name").setDescription("Team name (e.g. Vancouver Storm)").setRequired(true)
  )
  .addStringOption((o) =>
    o.setName("tag").setDescription("Team tag 2-5 chars (e.g. VCS)").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: false });

  const name = interaction.options.getString("name", true).trim();
  const rawTag = interaction.options.getString("tag", true).trim().toUpperCase();
  const discordId = interaction.user.id;
  const discordUsername = interaction.user.username;
  const guildId = interaction.guildId ?? undefined;

  // ── 1. Validate tag format ────────────────────────────────────────────────
  if (!/^[A-Z0-9]{2,5}$/.test(rawTag)) {
    await interaction.editReply(
      "❌ Tag must be 2–5 uppercase letters/numbers (e.g. `TSM`, `C9`, `VCS`)."
    );
    return;
  }

  // ── 2. Find or create player record ──────────────────────────────────────
  let player = (
    await db.select().from(playersTable).where(eq(playersTable.discordId, discordId)).limit(1)
  )[0];

  if (!player) {
    const [created] = await db
      .insert(playersTable)
      .values({
        discordId,
        discordUsername,
        riotId: `pending_${discordId}`,
        registrationStatus: "active",
      })
      .returning();
    player = created!;
  }

  // ── 3. Rate limit: max 1 team created per 24 hours ───────────────────────
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [{ recentCount }] = await db
    .select({ recentCount: count() })
    .from(teamsTable)
    .where(
      and(
        eq(teamsTable.captainPlayerId, player.id),
        gt(teamsTable.createdAt, oneDayAgo)
      )
    );

  if (recentCount > 0) {
    await interaction.editReply(
      "⏳ You already created a team in the last 24 hours. Try again later."
    );
    return;
  }

  // ── 4. Insert team + first member (captain) ───────────────────────────────
  try {
    const [team] = await db
      .insert(teamsTable)
      .values({
        name,
        tag: rawTag,
        captainPlayerId: player.id,
        discordServerId: guildId ?? null,
        teamElo: 1000,
        peakElo: 1000,
        isActive: true,
      })
      .returning();

    await db.insert(teamMembersTable).values({
      teamId: team!.id,
      playerId: player.id,
      role: null,
      status: "active",
    });

    // Write ELO baseline row
    await db.insert(eloHistoryTable).values({
      teamId: team!.id,
      elo: 1000,
      delta: 0,
      reason: "registration",
      matchId: null,
    });

    // ── 5. Reply ──────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`✅ Team **${name}** [${rawTag}] created!`)
      .addFields(
        { name: "Captain", value: `<@${discordId}>`, inline: true },
        { name: "Team ELO", value: "1000", inline: true }
      )
      .addFields({
        name: "Next steps",
        value:
          `• Add teammates: \`/add @player\` or \`/add RiotName#TAG\`\n` +
          `• Link your Riot ID: \`/link-riot YourName#TAG\`\n` +
          `• Submit a match: \`/submit\` with a .rofl file attachment`,
      })
      .setFooter({ text: `Team ID: ${team!.id}` });

    await interaction.editReply({ embeds: [embed] });
  } catch (err: unknown) {
    // Unique constraint violations (name or tag taken)
    if ((err as { code?: string }).code === "23505") {
      const detail = (err as { detail?: string }).detail ?? "";
      if (detail.includes("name")) {
        await interaction.editReply(`❌ Team name **${name}** is already taken. Choose another.`);
      } else if (detail.includes("tag")) {
        await interaction.editReply(`❌ Tag **${rawTag}** is already taken. Choose another.`);
      } else {
        await interaction.editReply("❌ Team name or tag is already taken.");
      }
      return;
    }
    console.error("[register-team] Error:", err);
    await interaction.editReply("❌ Something went wrong creating your team. Please try again.");
  }
}
