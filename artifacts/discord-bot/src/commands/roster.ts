/**
 * /roster
 *
 * Show the current team roster for the invoking user's team.
 * Spec: docs/BOT_SPEC.md → /roster
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
import { playersTable, teamMembersTable, teamsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("roster")
  .setDescription("Show your team's current active roster.");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const discordId = interaction.user.id;

  // Find invoker's player record
  const [invoker] = await db
    .select({ id: playersTable.id })
    .from(playersTable)
    .where(eq(playersTable.discordId, discordId))
    .limit(1);

  if (!invoker) {
    await interaction.editReply(
      "❌ You don't have a VCLoL player record. Ask a captain to `/add` you."
    );
    return;
  }

  // Find all active memberships
  const memberships = await db
    .select({
      teamId: teamsTable.id,
      teamName: teamsTable.name,
      teamTag: teamsTable.tag,
      membershipId: teamMembersTable.id,
    })
    .from(teamMembersTable)
    .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
    .where(
      and(
        eq(teamMembersTable.playerId, invoker.id),
        eq(teamMembersTable.status, "active"),
        eq(teamsTable.isActive, true)
      )
    );

  if (memberships.length === 0) {
    await interaction.editReply("❌ You are not an active member of any team.");
    return;
  }

  // Disambiguate if member of multiple teams
  let teamId: number;
  let teamName: string;
  let teamTag: string;

  if (memberships.length === 1) {
    teamId = memberships[0]!.teamId;
    teamName = memberships[0]!.teamName;
    teamTag = memberships[0]!.teamTag;
  } else {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("roster_team_select")
      .setPlaceholder("Which team's roster?")
      .addOptions(
        memberships.map((m) => ({ label: `${m.teamName} [${m.teamTag}]`, value: String(m.teamId) }))
      );
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    const reply = await interaction.editReply({ content: "Which team's roster do you want to see?", components: [row] });

    try {
      const sel = await reply.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: (i: StringSelectMenuInteraction) => i.user.id === discordId,
        time: 30_000,
      });
      await sel.deferUpdate();
      const chosen = memberships.find((m) => String(m.teamId) === sel.values[0]);
      if (!chosen) {
        await interaction.editReply({ content: "❌ Invalid selection.", components: [] });
        return;
      }
      teamId = chosen.teamId;
      teamName = chosen.teamName;
      teamTag = chosen.teamTag;
    } catch {
      await interaction.editReply({ content: "❌ Timed out.", components: [] });
      return;
    }
  }

  // Fetch all active members of the selected team
  const members = await db
    .select({
      riotId: playersTable.riotId,
      discordUsername: playersTable.discordUsername,
      role: teamMembersTable.role,
      captainPlayerId: teamsTable.captainPlayerId,
      playerId: playersTable.id,
    })
    .from(teamMembersTable)
    .innerJoin(playersTable, eq(teamMembersTable.playerId, playersTable.id))
    .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
    .where(
      and(
        eq(teamMembersTable.teamId, teamId),
        eq(teamMembersTable.status, "active")
      )
    );

  if (members.length === 0) {
    await interaction.editReply({ content: "❌ No active members found.", components: [] });
    return;
  }

  const rosterLines = members.map((m) => {
    const isCaptain = m.playerId === m.captainPlayerId;
    const role = m.role ?? "Unassigned";
    const linked = !m.riotId.startsWith("pending");
    const name = linked ? m.riotId : `${m.discordUsername} *(unlinked)*`;
    return `${isCaptain ? "👑" : "•"} ${name} — ${role}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`📋 Roster — ${teamName} [${teamTag}]`)
    .setDescription(rosterLines.join("\n"))
    .setFooter({ text: `${members.length} active member${members.length === 1 ? "" : "s"}` });

  await interaction.editReply({ embeds: [embed], components: [] });
}
