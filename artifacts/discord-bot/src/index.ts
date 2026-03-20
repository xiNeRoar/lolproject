/**
 * VCLoL Discord Bot — Entry Point
 *
 * Commands implemented:
 *   #3  /register-team  — create team, become captain
 *   #4  /add            — add player to team
 *   #6  /link-riot      — link Riot account
 *   #5  /submit         — submit .rofl (Issue #5, coming next)
 *   #24 /claim-match    — claim unregistered side (Issue #24)
 *   #25 /visibility     — control match visibility (Issue #25)
 *   #26 /transfer-captain — transfer captaincy (Issue #26)
 *   #27 /leave          — leave team (Issue #27)
 */

import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  REST,
  Routes,
  ChatInputCommandInteraction,
} from "discord.js";

import * as registerTeam from "./commands/register-team.js";
import * as add from "./commands/add.js";
import * as linkRiot from "./commands/link-riot.js";

const commands = [registerTeam, add, linkRiot];

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
});

client.once(Events.ClientReady, async (c) => {
  console.log(`[bot] Logged in as ${c.user.tag}`);
  await registerCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = commandMap.get(interaction.commandName);
  if (!cmd) return;

  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(`[bot] Error in /${interaction.commandName}:`, err);
    const reply = { content: "❌ An unexpected error occurred.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

client.login(token);
