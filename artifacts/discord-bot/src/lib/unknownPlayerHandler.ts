/**
 * Unknown player handler — interactive ✅/❌ buttons for unregistered players.
 * After /submit, shows buttons for each unknown player on an identified team side.
 * Captain can confirm to add them to roster.
 * Extracted from submit.ts for maintainability.
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { db } from "./db.js";
import {
  playersTable,
  teamsTable,
  teamMembersTable,
  matchPlayersTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

export interface UnknownPlayer {
  riotId: string;
  puuid: string;
  teamId: number;
  teamName: string;
}

/** Replace a button row at idx with a single disabled label. */
function disableRow(
  rows: ActionRowBuilder<ButtonBuilder>[],
  idx: number,
  label: string,
): ActionRowBuilder<ButtonBuilder>[] {
  return rows.map((row, i) =>
    i === idx
      ? new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`done_${idx}`).setLabel(label).setStyle(ButtonStyle.Secondary).setDisabled(true),
        )
      : row
  );
}

/**
 * Show interactive buttons for unknown players and handle captain confirmations.
 * Fire-and-forget from the caller's perspective (buttons have 5-minute timeout).
 */
export async function handleUnknownPlayers(
  interaction: ChatInputCommandInteraction,
  unknowns: UnknownPlayer[],
  matchId: number,
): Promise<void> {
  if (unknowns.length === 0) return;

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < unknowns.length && rows.length < 5; i++) {
    const u = unknowns[i]!;
    const shortName = u.riotId.length > 20 ? u.riotId.slice(0, 17) + "..." : u.riotId;
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`add_yes_${i}`)
          .setLabel(`Add ${shortName}`)
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`add_no_${i}`)
          .setLabel("Skip")
          .setStyle(ButtonStyle.Secondary),
      )
    );
  }

  const followUp = await interaction.followUp({
    content: `**${unknowns.length} unknown player(s)** on identified team sides. Add them to rosters?`,
    components: rows,
  });

  const collector = followUp.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
  });

  const handled = new Set<number>();

  collector.on("collect", async (btn) => {
    const parts = btn.customId.split("_");
    const action = parts[1];
    const idx = parseInt(parts[2] ?? "", 10);
    if (isNaN(idx) || idx >= unknowns.length || handled.has(idx)) {
      await btn.deferUpdate();
      return;
    }

    const u = unknowns[idx]!;

    // Only the captain of the relevant team can confirm
    const [invokerPlayer] = await db
      .select({ id: playersTable.id })
      .from(playersTable)
      .where(eq(playersTable.discordId, btn.user.id))
      .limit(1);

    if (!invokerPlayer) {
      await btn.reply({ content: "You don't have a VCLoL player record.", ephemeral: true });
      return;
    }

    const [captainCheck] = await db
      .select({ id: teamsTable.id })
      .from(teamsTable)
      .where(and(eq(teamsTable.id, u.teamId), eq(teamsTable.captainPlayerId, invokerPlayer.id)))
      .limit(1);

    if (!captainCheck) {
      await btn.reply({ content: "Only the team captain can confirm roster additions.", ephemeral: true });
      return;
    }

    handled.add(idx);

    if (action === "yes") {
      try {
        // Find or create player record
        let targetPlayer = (
          await db.select().from(playersTable).where(eq(playersTable.puuid, u.puuid)).limit(1)
        )[0];
        if (!targetPlayer) {
          targetPlayer = (
            await db.select().from(playersTable).where(eq(playersTable.riotId, u.riotId)).limit(1)
          )[0];
        }

        let playerId: number;
        if (targetPlayer) {
          playerId = targetPlayer.id;
          if (!targetPlayer.puuid && u.puuid) {
            await db.update(playersTable).set({ puuid: u.puuid }).where(eq(playersTable.id, playerId));
          }
        } else {
          const [created] = await db
            .insert(playersTable)
            .values({ riotId: u.riotId, discordUsername: u.riotId, discordId: null, puuid: u.puuid, registrationStatus: "active" })
            .returning();
          playerId = created!.id;
        }

        // Add to team as active (v3.1: .rofl auto-discovery, no invite needed)
        const [existingMember] = await db
          .select({ id: teamMembersTable.id })
          .from(teamMembersTable)
          .where(and(eq(teamMembersTable.teamId, u.teamId), eq(teamMembersTable.playerId, playerId)))
          .limit(1);

        if (!existingMember) {
          await db.insert(teamMembersTable)
            .values({ teamId: u.teamId, playerId, role: null, status: "active" });

          // DM notification if player has discordId
          if (targetPlayer?.discordId) {
            try {
              const dmUser = await btn.client.users.fetch(targetPlayer.discordId);
              const [teamInfo] = await db.select({ name: teamsTable.name, tag: teamsTable.tag })
                .from(teamsTable).where(eq(teamsTable.id, u.teamId)).limit(1);
              const tLabel = teamInfo ? `${teamInfo.name} [${teamInfo.tag}]` : u.teamName;
              const dmEmbed = new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle(`Added to ${tLabel}`)
                .setDescription(
                  `You were added to **${tLabel}** from a match replay.\n\n` +
                  `Run \`/connect\` to verify your Riot Account and claim your profile.`
                )
                .setFooter({ text: process.env.PLATFORM_URL ?? "https://vclol.gg" });
              await dmUser.send({ embeds: [dmEmbed] });
            } catch { /* DM failed — player can claim via website */ }
          }
        }

        // Link match_players row
        await db
          .update(matchPlayersTable)
          .set({ playerId })
          .where(and(eq(matchPlayersTable.matchId, matchId), eq(matchPlayersTable.puuid, u.puuid)));

        await btn.update({ components: disableRow(rows, idx, `✅ ${u.riotId} added`) });
      } catch (err) {
        console.error(`[submit] Add unknown player ${u.riotId}:`, err);
        await btn.update({ components: disableRow(rows, idx, `❌ Failed`) });
      }
    } else {
      await btn.update({ components: disableRow(rows, idx, `Skipped ${u.riotId}`) });
    }
  });

  collector.on("end", async () => {
    try {
      const disabled = rows.map((row) => {
        const r = new ActionRowBuilder<ButtonBuilder>();
        for (const c of row.components) r.addComponents(ButtonBuilder.from(c).setDisabled(true));
        return r;
      });
      await followUp.edit({ components: disabled });
    } catch { /* message may be deleted */ }
  });
}
