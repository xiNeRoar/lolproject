/**
 * /register-event <event>
 *
 * Registers the invoking captain's team for a VCLoL event.
 * Spec: docs/BOT_SPEC.md → /register-event
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
import { playersTable, teamsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3000";

export const data = new SlashCommandBuilder()
  .setName("register-event")
  .setDescription("Register your team for a VCLoL event.")
  .addStringOption((o) =>
    o
      .setName("event")
      .setDescription("Event ID or slug (e.g. 'spring-2025' or '3')")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const eventArg = interaction.options.getString("event", true).trim();
  const discordId = interaction.user.id;

  // ── 1. Resolve invoking player ───────────────────────────────────────────
  const [player] = await db
    .select({ id: playersTable.id, riotId: playersTable.riotId })
    .from(playersTable)
    .where(eq(playersTable.discordId, discordId))
    .limit(1);

  if (!player) {
    await interaction.editReply(
      "❌ You are not registered on VCLoL. Use `/register-team` first."
    );
    return;
  }

  // ── 2. Find all teams where invoking player is captain ───────────────────
  const captainTeams = await db
    .select({ teamId: teamsTable.id, teamName: teamsTable.name, teamTag: teamsTable.tag })
    .from(teamsTable)
    .where(and(eq(teamsTable.captainPlayerId, player.id), eq(teamsTable.isActive, true)));

  if (captainTeams.length === 0) {
    await interaction.editReply(
      "❌ You are not the captain of any active team. Only captains can register for events."
    );
    return;
  }

  // Disambiguate if captain of multiple teams
  let teamId: number;

  if (captainTeams.length === 1) {
    teamId = captainTeams[0]!.teamId;
  } else {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("register_event_team_select")
      .setPlaceholder("Which team do you want to register?")
      .addOptions(captainTeams.map((t) => ({ label: `${t.teamName} [${t.teamTag}]`, value: String(t.teamId) })));
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    const reply = await interaction.editReply({ content: "Which team do you want to register for this event?", components: [row] });

    try {
      const sel = await reply.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: (i: StringSelectMenuInteraction) => i.user.id === discordId,
        time: 30_000,
      });
      await sel.deferUpdate();
      const chosen = captainTeams.find((t) => String(t.teamId) === sel.values[0]);
      if (!chosen) {
        await interaction.editReply({ content: "❌ Invalid selection.", components: [] });
        return;
      }
      teamId = chosen.teamId;
    } catch {
      await interaction.editReply({ content: "❌ Timed out.", components: [] });
      return;
    }
  }

  // ── 3. Call API to register ───────────────────────────────────────────────
  let responseData: {
    id?: number;
    eventTitle?: string;
    teamName?: string;
    teamTag?: string;
    error?: string;
  };

  try {
    const res = await fetch(`${API_BASE}/api/events/${encodeURIComponent(eventArg)}/register-team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, captainPlayerId: player.id }),
    });
    responseData = await res.json();

    if (!res.ok) {
      await interaction.editReply(`❌ ${responseData.error ?? "Failed to register."}`);
      return;
    }
  } catch (err) {
    console.error("[register-event] API error:", err);
    await interaction.editReply("❌ Could not connect to VCLoL API. Try again later.");
    return;
  }

  // ── 4. Success reply ──────────────────────────────────────────────────────
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("✅ Team Registered")
    .setDescription(
      `**[${responseData.teamTag}] ${responseData.teamName}** has been registered for **${responseData.eventTitle}**.`
    )
    .addFields(
      { name: "Event", value: responseData.eventTitle ?? eventArg, inline: true },
      { name: "Team", value: `[${responseData.teamTag}] ${responseData.teamName}`, inline: true },
      { name: "Status", value: "Registered", inline: true },
    )
    .setFooter({ text: "An admin will confirm your registration." });

  await interaction.editReply({ embeds: [embed] });
}
