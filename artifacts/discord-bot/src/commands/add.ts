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
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
} from "discord.js";
import { db } from "../lib/db.js";
import { replyError } from "../lib/replyError.js";
import {
  playersTable,
  teamsTable,
  teamMembersTable,
} from "@workspace/db";
import { eq, and, count, inArray } from "drizzle-orm";
import { checkBan } from "../lib/checkBan.js";

const VALID_ROLES = ["top", "jungle", "mid", "adc", "support", "fill"];
const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://vclol.gg";

export const data = new SlashCommandBuilder()
  .setName("add")
  .setDescription("Invite a player to your team.")
  .addUserOption((o) =>
    o
      .setName("discord-user")
      .setDescription("Pick a Discord user from this server")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("riot-id")
      .setDescription("Or enter a RiotName#TAG (for cross-server players)")
      .setRequired(false)
  )
  .addStringOption((o) =>
    o
      .setName("role")
      .setDescription("Optional role (top/jungle/mid/adc/support/fill)")
      .setRequired(false)
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


  const discordId = interaction.user.id;
  const targetUser = interaction.options.getUser("discord-user");
  const riotIdInput = interaction.options.getString("riot-id")?.trim() ?? null;
  const roleInput = interaction.options.getString("role")?.toLowerCase().trim() ?? null;

  if (!targetUser && !riotIdInput) {
    await replyError(interaction, "❌ Provide either a Discord user or a RiotName#TAG.");
    return;
  }

  // ── Validate role ────────────────────────────────────────────────────────
  const role = roleInput && VALID_ROLES.includes(roleInput) ? roleInput : null;

  // ── Find invoker's player record ─────────────────────────────────────────
  const invoker = (
    await db.select().from(playersTable).where(eq(playersTable.discordId, discordId)).limit(1)
  )[0];

  if (!invoker) {
    await replyError(interaction, 
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
    await replyError(interaction, 
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
    const reply = await interaction.editReply({
      content: "You captain multiple teams. Which one?",
      components: [row],
    });

    try {
      const selection = await reply.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: (i: StringSelectMenuInteraction) => i.user.id === discordId,
        time: 30_000,
      });
      await selection.deferUpdate();
      const selected = captainTeams.find((t) => String(t.id) === selection.values[0]);
      if (!selected) {
        await replyError(interaction, { content: "❌ Invalid selection.", components: [] });
        return;
      }
      teamId = selected.id;
      teamName = selected.name;
      teamTag = selected.tag;
    } catch {
      await replyError(interaction, { content: "❌ Timed out. Please try again.", components: [] });
      return;
    }
  }

  // ── Resolve target player from input ─────────────────────────────────────
  let targetPlayer: typeof playersTable.$inferSelect | undefined;
  let targetDiscordId: string | null = null;
  let targetUsername: string | null = null;

  if (targetUser) {
    // Discord user picker — proper User object with .id
    targetDiscordId = targetUser.id;
    targetUsername = targetUser.username;

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
          riotId: `pending_${targetDiscordId}`,
          registrationStatus: "active",
        })
        .returning();
      targetPlayer = created!;
    }
  } else if (riotIdInput) {
    // RiotName#TAG
    const riotIdMatch = riotIdInput.match(/^(.+)#([A-Za-z0-9]{1,5})$/);
    if (!riotIdMatch) {
      await replyError(interaction, "❌ Invalid Riot ID format. Use `RiotName#TAG` (e.g. `xiNe#NA1`).");
      return;
    }
    if (riotIdMatch[1]!.length > 16) {
      await replyError(interaction, "❌ Game name too long (max 16 characters).");
      return;
    }
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
  }

  if (!targetPlayer) {
    await replyError(interaction, "❌ Could not resolve player. Try again.");
    return;
  }

  // ── Check not already on team (active or pending) ───────────────────────
  const [existingActive] = await db
    .select({ status: teamMembersTable.status })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, teamId),
        eq(teamMembersTable.playerId, targetPlayer.id),
        eq(teamMembersTable.status, "active")
      )
    )
    .limit(1);

  if (existingActive) {
    await replyError(interaction, 
      `❌ **${targetPlayer.riotId.startsWith("pending") ? targetUsername ?? "That player" : targetPlayer.riotId}** is already on **${teamName}**.`
    );
    return;
  }

  const [existingPending] = await db
    .select({ status: teamMembersTable.status })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, teamId),
        eq(teamMembersTable.playerId, targetPlayer.id),
        eq(teamMembersTable.status, "pending")
      )
    )
    .limit(1);

  if (existingPending) {
    await replyError(interaction, 
      `❌ **${targetPlayer.riotId.startsWith("pending") ? targetUsername ?? "That player" : targetPlayer.riotId}** already has a pending invite to **${teamName}**.`
    );
    return;
  }

  // ── Check roster size cap ─────────────────────────────────────────────────
  const MAX_ROSTER_SIZE = 15; // 5 starters + 10 subs
  const [{ activeCount }] = await db
    .select({ activeCount: count() })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, teamId),
        eq(teamMembersTable.status, "active")
      )
    );

  if (activeCount >= MAX_ROSTER_SIZE) {
    await replyError(interaction, 
      `❌ Team roster is full (${activeCount}/${MAX_ROSTER_SIZE}). Remove an inactive member with \`/remove\` first.`
    );
    return;
  }

  // ── Add to team ───────────────────────────────────────────────────────────
  // Check pending invite limit (max 5 per captain)
  const MAX_PENDING = 5;
  const captainTeamIds = (
    await db.select({ id: teamsTable.id }).from(teamsTable)
      .where(eq(teamsTable.captainPlayerId, invoker.id))
  ).map((t) => t.id);

  if (captainTeamIds.length > 0) {
    const [{ pendingCount }] = await db
      .select({ pendingCount: count() })
      .from(teamMembersTable)
      .where(
        and(
          inArray(teamMembersTable.teamId, captainTeamIds),
          eq(teamMembersTable.status, "pending")
        )
      );
    if (Number(pendingCount) >= MAX_PENDING) {
      await replyError(interaction, 
        `❌ You have ${pendingCount} pending invites. Wait for responses or cancel them before inviting more.`
      );
      return;
    }
  }

  // Insert as pending — not active until player accepts
  const [membership] = await db.insert(teamMembersTable).values({
    teamId,
    playerId: targetPlayer.id,
    role: role ?? null,
    status: "pending",
  }).returning();

  const displayName =
    !targetPlayer.riotId.startsWith("pending")
      ? targetPlayer.riotId
      : targetUsername ?? `<@${targetDiscordId}>`;

  // ── DM the invited player with ✅/❌ buttons ────────────────────────────────
  let dmSent = false;
  if (targetDiscordId) {
    try {
      const dmUser = await interaction.client.users.fetch(targetDiscordId);
      const dmEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Team Invite — ${teamName} [${teamTag}]`)
        .setDescription(
          `**${interaction.user.username}** has invited you to join **${teamName}** [${teamTag}].\n\n` +
          `Click **Accept** to join the roster, or **Decline** to dismiss.`
        )
        .setFooter({ text: `${PLATFORM_URL} · Expires in 24 hours` });

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`invite_accept_${membership!.id}`)
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`invite_decline_${membership!.id}`)
          .setLabel("Decline")
          .setStyle(ButtonStyle.Secondary),
      );

      await dmUser.send({ embeds: [dmEmbed], components: [row] });
      dmSent = true;
    } catch {
      // DM failed — still create pending invite, player can accept via /roster or website
    }
  }

  // ── Reply to captain ──────────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📨 Invite sent — ${teamName} [${teamTag}]`)
    .addFields(
      { name: "Player", value: displayName, inline: true },
      { name: "Role", value: role ?? "Unassigned", inline: true },
      { name: "Status", value: dmSent ? "DM sent — waiting for response" : "⚠️ Could not DM player — they may need to accept via the website", inline: false },
    );

  if (targetPlayer.riotId.startsWith("pending")) {
    embed.addFields({
      name: "⚠️ Riot ID not linked",
      value: `Ask them to run \`/link-riot YourName#TAG\` to link their account.`,
    });
  }

  await interaction.editReply({ embeds: [embed], components: [] });
}
