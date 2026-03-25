/**
 * VCLoL Discord Bot — Entry Point
 *
 * Commands implemented:
 *   #3  /register-team  — create team, become captain
 *   #4  /add            — add player to team
 *   #6  /link-riot      — link Riot account
 *   #5  /submit         — submit .rofl replay
 *   #24 /claim-match    — claim unregistered side
 *   #25 /visibility     — control match visibility
 *   #26 /transfer-captain — transfer captaincy
 *   #27 /leave          — leave team
 *   #70 /register-event — register team for event
 *   #141 /stats         — quick stats lookup
 *   #141 /roster        — show team roster
 *   #141 /remove        — captain removes member
 */

import {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
  REST,
  Routes,
  ChatInputCommandInteraction,
} from "discord.js";
import { db, botHeartbeatsTable } from "./lib/db.js";
import { startNotificationPoller, stopNotificationPoller } from "./lib/notificationPoller.js";
import { startSeasonBroadcaster } from "./lib/seasonBroadcaster.js";
import { handleInviteButton, cleanupExpiredInvites } from "./lib/inviteHandler.js";

import * as registerTeam from "./commands/register-team.js";
import * as submit from "./commands/submit.js";
import * as claimMatch from "./commands/claim-match.js";
import * as visibility from "./commands/visibility.js";
import * as leave from "./commands/leave.js";
import * as transferCaptain from "./commands/transfer-captain.js";
import * as registerEvent from "./commands/register-event.js";
import * as stats from "./commands/stats.js";
import * as roster from "./commands/roster.js";
import * as remove from "./commands/remove.js";
import * as connect from "./commands/connect.js";

const commands = [registerTeam, submit, claimMatch, visibility, leave, transferCaptain, registerEvent, stats, roster, remove, connect];

// ── Build command collection ───────────────────────────────────────────────

type CommandModule = {
  data: { name: string; toJSON(): unknown };
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
};

const commandMap = new Collection<string, CommandModule>();
for (const cmd of commands as CommandModule[]) {
  commandMap.set(cmd.data.name, cmd);
}

// ── Register slash commands with Discord ──────────────────────────────────

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error("[bot] DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID must be set");
  process.exit(1);
}

const rest = new REST().setToken(token);

async function registerCommands() {
  try {
    console.log(`[bot] Registering ${commands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(clientId!), {
      body: commands.map((c) => (c as CommandModule).data.toJSON()),
    });
    console.log("[bot] Slash commands registered.");
  } catch (err) {
    console.error("[bot] Failed to register commands:", err);
  }
}

// ── Create client ─────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.Channel,  // Required for DM button interactions (invite accept/decline)
    Partials.Message,  // Required for DM message component collection
  ],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`[bot] Logged in as ${c.user.tag}`);
  await registerCommands();

  // ── Heartbeat writer (BOT_SPEC §Health Monitoring) ────────────────────
  // Writes to bot_heartbeats every 5 minutes so GET /api/bot-status works.
  async function writeHeartbeat() {
    try {
      await db.insert(botHeartbeatsTable).values({ timestamp: new Date() });
    } catch (err) {
      console.error("[bot] Failed to write heartbeat:", err);
    }
  }
  await writeHeartbeat(); // immediate on startup
  setInterval(writeHeartbeat, 5 * 60 * 1000); // every 5 minutes

  // ── Notification poller (BOT_SPEC §Notification Poller) ───────────────────
  startNotificationPoller(c);

  // ── Season broadcaster (BOT_SPEC §Season Broadcast) ─────────────────────
  startSeasonBroadcaster(c);

  // ── Clean up expired pending invites from previous sessions ──────────────
  cleanupExpiredInvites().catch((err) =>
    console.error("[bot] Failed to clean expired invites:", err)
  );
});

client.on(Events.InteractionCreate, async (interaction) => {
  // ── Handle invite accept/decline buttons (persistent across restarts) ────
  if (interaction.isButton() && interaction.customId.startsWith("invite_")) {
    try {
      await handleInviteButton(interaction);
    } catch (err) {
      console.error("[bot] Invite button error:", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ An error occurred.", ephemeral: true }).catch(() => {});
      }
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const cmd = commandMap.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`[bot] Error in /${interaction.commandName}:`, err);
    const reply = { content: "❌ An unexpected error occurred.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

client.login(token);

// ── Graceful shutdown ─────────────────────────────────────────────────────

async function shutdown(signal: string) {
  console.log(`[bot] Received ${signal}. Shutting down gracefully...`);
  stopNotificationPoller();
  client.destroy();
  console.log("[bot] Client destroyed. Exiting.");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
