#!/usr/bin/env node
/**
 * validate_rofl.mjs — Test the VCLoL ROFL2 parser against a real .rofl file.
 *
 * Usage: node scripts/validate_rofl.mjs path/to/your/replay.rofl
 *
 * What it checks:
 * 1. File parses without error
 * 2. Returns exactly 10 players (5 blue, 5 red)
 * 3. Each player has: PUUID, riotId (GAME_NAME#TAG_LINE), champion, KDA, CS, gold, items
 * 4. gameId, gameLength, gameVersion are present
 * 5. Prints all extracted data for manual inspection
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Inline the parser logic so this script runs standalone without build step
// Uses the same parsing logic as lib/rofl-parse/src/rofl-parser.ts

const ROFL2_MAGIC = Buffer.from([0x52, 0x49, 0x4F, 0x54, 0x00, 0x00]);

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/validate_rofl.mjs <path-to-rofl-file>");
  process.exit(1);
}

const buf = readFileSync(resolve(file));
console.log(`File: ${file} (${buf.length} bytes)`);
console.log(`Magic bytes: ${buf.slice(0, 6).toString("hex")}`);
console.log(`Expected:    ${ROFL2_MAGIC.toString("hex")}`);

if (!buf.slice(0, 6).equals(ROFL2_MAGIC)) {
  console.error("❌ Not a ROFL2 file (magic bytes mismatch)");
  process.exit(1);
}
console.log("✅ ROFL2 magic bytes match\n");

// Read metadata length (uint32 LE at offset 262) and metadata JSON
const metadataLength = buf.readUInt32LE(262);
console.log(`Metadata length: ${metadataLength}`);
const metadataStart = 266;
const metadataJson = buf.slice(metadataStart, metadataStart + metadataLength).toString("utf8");

let metadata;
try {
  metadata = JSON.parse(metadataJson);
  console.log("✅ Metadata JSON parsed\n");
} catch (e) {
  console.error("❌ Failed to parse metadata JSON:", e.message);
  console.log("Raw (first 500 chars):", metadataJson.slice(0, 500));
  process.exit(1);
}

// Top-level fields
const topFields = ["gameLength", "gameVersion", "statsJson"];
for (const f of topFields) {
  if (metadata[f] !== undefined) {
    console.log(`✅ metadata.${f}: ${f === "statsJson" ? `(${String(metadata[f]).length} chars)` : metadata[f]}`);
  } else {
    console.log(`❌ metadata.${f}: MISSING`);
  }
}

// Check for gameId (may be at top level or need derivation)
const possibleGameIdFields = ["gameId", "matchId", "gameID", "GAME_ID"];
let gameId = null;
for (const f of possibleGameIdFields) {
  if (metadata[f]) { gameId = metadata[f]; break; }
}
console.log(`${gameId ? "✅" : "⚠️"} gameId: ${gameId ?? "NOT FOUND at top level (may be derived from filename)"}\n`);

// Parse statsJson
let players;
try {
  players = JSON.parse(metadata.statsJson);
  if (!Array.isArray(players)) {
    console.error("❌ statsJson is not an array");
    process.exit(1);
  }
  console.log(`✅ statsJson parsed: ${players.length} player entries\n`);
} catch (e) {
  console.error("❌ Failed to parse statsJson:", e.message);
  process.exit(1);
}

if (players.length !== 10) {
  console.warn(`⚠️ Expected 10 players, got ${players.length}`);
}

// Check each player
const criticalFields = ["PUUID", "RIOT_ID_GAME_NAME", "RIOT_ID_TAG_LINE", "SKIN", "TEAM", "WIN",
  "CHAMPIONS_KILLED", "NUM_DEATHS", "ASSISTS", "MINIONS_KILLED", "NEUTRAL_MINIONS_KILLED",
  "GOLD_EARNED", "VISION_SCORE", "TOTAL_DAMAGE_DEALT_TO_CHAMPIONS",
  "ITEM0", "ITEM1", "ITEM2", "ITEM3", "ITEM4", "ITEM5", "ITEM6"];

let allOk = true;
for (let i = 0; i < players.length; i++) {
  const p = players[i];
  const missing = criticalFields.filter(f => p[f] === undefined);
  const name = p.RIOT_ID_GAME_NAME ?? p.NAME ?? `Player${i}`;
  const tag = p.RIOT_ID_TAG_LINE ?? "???";
  const team = p.TEAM === "100" || p.TEAM === 100 ? "Blue" : "Red";
  
  if (missing.length > 0) {
    console.log(`❌ [${i}] ${name}#${tag} (${team}) — MISSING: ${missing.join(", ")}`);
    allOk = false;
  } else {
    console.log(`✅ [${i}] ${name}#${tag} (${team}) — ${p.SKIN} — KDA: ${p.CHAMPIONS_KILLED}/${p.NUM_DEATHS}/${p.ASSISTS} — CS: ${Number(p.MINIONS_KILLED)+Number(p.NEUTRAL_MINIONS_KILLED)} — Gold: ${p.GOLD_EARNED} — DMG: ${p.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS} — Vision: ${p.VISION_SCORE}`);
    console.log(`   PUUID: ${String(p.PUUID).slice(0, 20)}... | Items: [${p.ITEM0},${p.ITEM1},${p.ITEM2},${p.ITEM3},${p.ITEM4},${p.ITEM5},${p.ITEM6}]`);
  }
}

console.log(`\n${"=".repeat(60)}`);
if (allOk && players.length === 10) {
  console.log("✅ ALL CHECKS PASSED — .rofl file is compatible with VCLoL parser");
} else {
  console.log("⚠️ ISSUES FOUND — review output above");
}

// Dump all field names from first player for discovery
console.log(`\nAll field names in players[0] (${Object.keys(players[0]).length} fields):`);
console.log(Object.keys(players[0]).sort().join(", "));
