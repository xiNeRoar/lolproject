/**
 * /add <@user|RiotName#TAG> [role]
 *
 * Adds a player to the captain's team.
 * Accepts Discord @mention (same server) or RiotName#TAG (cross-server).
 * Spec: docs/BOT_SPEC.md → /add
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
import {
  playersTable,
  teamsTable,
  teamMembersTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const VALID_ROLES = ["top", "jungle", "mid", "adc", "support", "fill"];

export const data = new SlashCommandBuilder()
  .setName("add")
  .setDescription("Add a player to your team.")
  .addStringOption((o) =>
    o
      .setName("player")
      .setDescription("@DiscordMention or RiotName#TAG")
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("role")
      .setDescription("Optional role (top/jungle/mid/adc/support/fill)")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: false });

  const discordId = interaction.user.id;
  const playerInput = interaction.options.getString("player", true).trim();
  const roleInput = interaction.options.getString("role")?.toLowerCase().trim() ?? null;

  // ── Validate role ────────────────────────────────────────────────────────
  const role = roleInput && VALID_ROLES.includes(roleInput) ? roleInput : null;

  // ── Find invoker's player record ─────────────────────────────────────────
  const invoker = (
    await db.select().from(playersTable).where(eq(playersTable.discordId, discordId)).limit(1)
  )[0];

  if (!invoker) {
    await interaction.editReply(
      "❌ You don't have a player record. Use `/register-team` to create a team first."
    );
    return;
  }

  // ── Find teams where invoker is captain ──────────────────────────────────
  const captainTeams = await db
    .select({
      id: teamsTable.id,
      name: teamsTable.name,
      tag: teamsTable.tag,
    })
    .from(teamsTable)
    .where(and(eq(teamsTable.captainPlayerId, invoker.id), eq(teamsTable.isActive, true)));

  if (captainTeams.length === 0) {
    await interaction.editReply(
      "❌ You are not the captain of any active team. Use `/register-team` to create one."
    );
    return;
  }

  // ── Determine which team (with disambiguation if needed) ──────────────────
  let teamId: number;
  let teamName: string;
  let teamTag: string;

  if (captainTeams.length === 1) {
    teamId = captainTeams[0]!.id;
    teamName = captainTeams[0]!.name;
    teamTag = captainTeams[0]!.tag;
  } else {
    // Multiple teams → show select menu
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("team_select")
      .setPlaceholder("Which team do you want to add this player to?")
      .addOptions(
        captainTeams.map((t) => ({
          label: `${t.name} [${t.tag}]`,
          value: String(t.id),
        }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    await interaction.editReply({
      content: "You captain multiple teams. Which one?",
      components: [row],
    });

    try {
      const selection = await interaction.channel!.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: (i: StringSelectMenuInteraction) => i.user.id === discordId,
        time: 30_000,
      });
      await selection.deferUpdate();
      const selected = captainTeams.find((t) => String(t.id) === selection.values[0]);
      if (!selected) {
        await interaction.editReply({ content: "❌ Invalid selection.", components: [] });
        return;
      }
      teamId = selected.id;
      teamName = selected.name;
      teamTag = selected.tag;
    } catch {
      await interaction.editReply({ content: "❌ Timed out. Please try again.", components: [] });
      return;
    }
  }

  // ── Resolve target player from input ─────────────────────────────────────
  const mentionMatch = playerInput.match(/^<@!?(\d+)>$/);
  const riotIdMatch = playerInput.match(/^(.+)#([A-Za-z0-9]{1,5})$/);

  let targetPlayer: typeof playersTable.$inferSelect | undefined;
  let targetDiscordId: string | null = null;
  let targetUsername: string | null = null;

  if (mentionMatch) {
    // Discord @mention
    targetDiscordId = mentionMatch[1]!;
    const member = await interaction.guild?.members.fetch(targetDiscordId).catch(() => null);
    targetUsername = member?.user.username ?? targetDiscordId;

    targetPlayer = (
      await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.discordId, targetDiscordId))
        .limit(1)
    )[0];

    if (!targetPlayer) {
      // Create shell player record
      const [created] = await db
        .insert(playersTable)
        .values({
          discordId: targetDiscordId,
          discordUsername: targetUsername,
          riotId: "pending",
          registrationStatus: "active",
        })
        .returning();
      targetPlayer = created!;
    }
  } else if (riotIdMatch) {
    // RiotName#TAG
    const riotId = `${riotIdMatch[1]}#${riotIdMatch[2]}`;
    targetPlayer = (
      await db.select().from(playersTable).where(eq(playersTable.riotId, riotId)).limit(1)
    )[0];

    if (!targetPlayer) {
      const [created] = await db
        .insert(playersTable)
        .values({
          discordId: null,
          discordUsername: riotId,
          riotId,
          registrationStatus: "active",
        })
        .returning();
      targetPlayer = created!;
    }
  } else {
    await interaction.editReply(
      "❌ Invalid format. Use `@DiscordMention` or `RiotName#TAG` (e.g. `xiNe#NA1`)."
    );
    return;
  }

  // ── Check not already on team ─────────────────────────────────────────────
  const existing = (
    await db
      .select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, teamId),
          eq(teamMembersTable.playerId, targetPlayer.id),
          eq(teamMembersTable.status, "active")
        )
      )
      .limit(1)
  )[0];

  if (existing) {
    await interaction.editReply(
      `❌ **${targetPlayer.riotId === "pending" ? targetUsername ?? "That player" : targetPlayer.riotId}** is already on **${teamName}**.`
    );
    return;
  }

  // ── Add to team ───────────────────────────────────────────────────────────
  await db.insert(teamMembersTable).values({
    teamId,
    playerId: targetPlayer.id,
    role: role ?? null,
    status: "active",
  });

  const displayName =
    targetPlayer.riotId !== "pending"
      ? targetPlayer.riotId
      : targetUsername ?? `<@${targetDiscordId}>`;

  // ── DM the added player ───────────────────────────────────────────────────
  if (targetDiscordId) {
    try {
      const dmUser = await interaction.client.users.fetch(targetDiscordId);
      await dmUser.send(
        `👋 You've been added to **${teamName}** [${teamTag}] by **${interaction.user.username}**.\n` +
        `• Link your Riot ID: \`/link-riot YourName#TAG\`\n` +
        `• If this was a mistake: \`/leave\``
      );
    } catch {
      // DM failed (user has DMs disabled) — not an error, just skip
    }
  }

  // ── Reply ─────────────────────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`✅ Player added to **${teamName}** [${teamTag}]`)
    .addFields(
      { name: "Player", value: displayName, inline: true },
      { name: "Role", value: role ?? "Unassigned", inline: true }
    );

  if (targetPlayer.riotId === "pending") {
    embed.addFields({
      name: "⚠️ Riot ID not linked",
      value: `Ask them to run \`/link-riot YourName#TAG\` to link their account and claim match stats.`,
    });
  }

  await interaction.editReply({ embeds: [embed], components: [] });
}
