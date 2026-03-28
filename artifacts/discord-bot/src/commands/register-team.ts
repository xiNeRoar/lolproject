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
import { replyError } from "../lib/replyError.js";
import {
  teamsTable,
  teamMembersTable,
  playersTable,
} from "@workspace/db";
import { eq, and, gt, count } from "drizzle-orm";
import { checkBan } from "../lib/checkBan.js";
import { checkOffensiveContent } from "../lib/contentFilter.js";

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

  // ── Ban check ──────────────────────────────────────────────────────────────
  const banReason = await checkBan(interaction.user.id);
  if (banReason) {
    await replyError(interaction, `❌ Your account is currently banned: ${banReason}`);
    return;
  }

  // ── Guild-only guard ────────────────────────────────────────────────────
  if (!interaction.inGuild()) {
    await replyError(interaction, "❌ This command can only be used in a Discord server, not in DMs.");
    return;
  }


  const name = interaction.options.getString("name", true).trim();
  const rawTag = interaction.options.getString("tag", true).trim().toUpperCase();
  const discordId = interaction.user.id;
  const discordUsername = interaction.user.username;
  const guildId = interaction.guildId ?? undefined;

  // ── 1. Validate name length ───────────────────────────────────────────────
  if (name.length < 2 || name.length > 50) {
    await replyError(interaction, 
      "❌ Team name must be between 2 and 50 characters."
    );
    return;
  }

  // ── 2. Validate tag format ────────────────────────────────────────────────
  if (!/^[A-Z0-9]{2,5}$/.test(rawTag)) {
    await replyError(interaction, 
      "❌ Tag must be 2–5 uppercase letters/numbers (e.g. `TSM`, `C9`, `VCS`)."
    );
    return;
  }

  // ── 3. Content moderation ──────────────────────────────────────────────────
  const offensiveName = checkOffensiveContent(name);
  if (offensiveName) {
    console.warn(`[register-team] Blocked offensive name: "${name}" by ${discordId}`);
    await replyError(interaction, "❌ Team name contains prohibited content. Choose another name.");
    return;
  }
  const offensiveTag = checkOffensiveContent(rawTag);
  if (offensiveTag) {
    console.warn(`[register-team] Blocked offensive tag: "${rawTag}" by ${discordId}`);
    await replyError(interaction, "❌ Team tag contains prohibited content. Choose another tag.");
    return;
  }

  // ── 4. RSO verification check (v3.1) ────────────────────────────────────
  const player = (
    await db.select().from(playersTable).where(eq(playersTable.discordId, discordId)).limit(1)
  )[0];

  if (!player || !player.puuid) {
    await replyError(interaction,
      "❌ Please verify your Riot Account first. Run `/connect` to get started."
    );
    return;
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
    await replyError(interaction, 
      "⏳ You already created a team in the last 24 hours. Try again later."
    );
    return;
  }

  // ── 3b. Max active teams per captain ────────────────────────────────────
  const MAX_ACTIVE_TEAMS = 3;
  const [{ activeTeamCount }] = await db
    .select({ activeTeamCount: count() })
    .from(teamsTable)
    .where(
      and(
        eq(teamsTable.captainPlayerId, player.id),
        eq(teamsTable.isActive, true)
      )
    );

  if (Number(activeTeamCount) >= MAX_ACTIVE_TEAMS) {
    await replyError(interaction, 
      `❌ You already captain ${activeTeamCount} active teams (max ${MAX_ACTIVE_TEAMS}). Transfer captaincy or wait for inactive teams to be archived.`
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

    // ── 5. Reply ──────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`✅ Team **${name}** [${rawTag}] created!`)
      .addFields(
        { name: "Captain", value: `<@${discordId}>`, inline: true },
      )
      .addFields({
        name: "Next steps",
        value:
          `• Submit a match: \`/submit\` with a .rofl file attachment\n` +
          `• Teammates are auto-added from .rofl data`,
      })
      .setFooter({ text: `Team ID: ${team!.id}` });

    await interaction.editReply({ embeds: [embed] });
  } catch (err: unknown) {
    // Unique constraint violations (name or tag taken)
    if ((err as { code?: string }).code === "23505") {
      const detail = (err as { detail?: string }).detail ?? "";
      if (detail.includes("name")) {
        await replyError(interaction, `❌ Team name **${name}** is already taken. Choose another.`);
      } else if (detail.includes("tag")) {
        await replyError(interaction, `❌ Tag **${rawTag}** is already taken. Choose another.`);
      } else {
        await replyError(interaction, "❌ Team name or tag is already taken.");
      }
      return;
    }
    console.error("[register-team] Error:", err);
    await replyError(interaction, "❌ Something went wrong creating your team. Please try again.");
  }
}
