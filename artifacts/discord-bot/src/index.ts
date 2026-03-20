/**
 * VCLoL Discord Bot — Entry Point
 *
 * Status: under construction.
 * Commands are implemented per GitHub Issues #3–#6, #24–#27.
 */

import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once("ready", (c) => {
  console.log(`[bot] Logged in as ${c.user.tag}`);
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("[bot] DISCORD_BOT_TOKEN not set");
  process.exit(1);
}

client.login(token);
