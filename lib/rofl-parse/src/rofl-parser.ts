/**
 * ROFL2 replay file parser for VCLoL.
 *
 * Binary format (from roflxd.cs source, community-validated):
 *
 *   Offset  Size  Field
 *   0       6     Magic bytes: 52 49 4F 54 02 00 ("RIOT\x02\x00")
 *   6       2     Header length (uint16 LE)
 *   8       4     File length (uint32 LE)
 *   12      4     Metadata offset (uint32 LE)
 *   16      4     Metadata length (uint32 LE)
 *   20      4     Payload header offset (uint32 LE)
 *   24      4     Payload header length (uint32 LE)
 *   28      4     Payload offset (uint32 LE)
 *   32      4     Payload length (uint32 LE)
 *
 * The metadata JSON at [metadataOffset, metadataOffset+metadataLength] contains
 * a `statsJson` field which is itself a JSON string of PlayerStats2[].
 * Only the metadata header is parsed — the encrypted payload is never touched.
 */

import { readFileSync } from "fs";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAGIC = Buffer.from([0x52, 0x49, 0x4f, 0x54, 0x02, 0x00]); // "RIOT\x02\x00"

const VALID_GAME_MODE = "CLASSIC";
const VALID_MAP_ID = 11; // Summoner's Rift

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RoflPlayer {
  /** Riot display name (e.g. "xiNe") */
  riotIdGameName: string;
  /** Riot tagline (e.g. "NA1") */
  riotIdTagLine: string;
  /** Full Riot ID for display (e.g. "xiNe#NA1") */
  riotId: string;
  /** Encrypted account PUUID — primary identity key */
  puuid: string;
  /** Champion name (from SKIN field, e.g. "Orianna") */
  champion: string;
  /** 100 = Blue side, 200 = Red side */
  team: 100 | 200;
  /** Whether this player won */
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  /** Minions killed */
  cs: number;
  /** Neutral minions killed (jungle camps) */
  neutralCs: number;
  gold: number;
  damageToChampions: number;
  visionScore: number;
  level: number;
  /** Lane/role (e.g. "TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY") */
  teamPosition: string;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  /** Trinket slot */
  item6: number;
  summonerSpell1: number;
  summonerSpell2: number;
}

export interface RoflMatch {
  /** Game ID from Riot servers */
  gameId: string;
  /** Game duration in milliseconds */
  gameLength: number;
  /** Patch version string (e.g. "15.6.0.0") */
  gameVersion: string;
  /** Must be "CLASSIC" */
  gameMode: string;
  /** Must be 11 (Summoner's Rift) */
  mapId: number;
  /** All 10 players */
  players: RoflPlayer[];
  /** Blue side players (TEAM=100) */
  blueSide: RoflPlayer[];
  /** Red side players (TEAM=200) */
  redSide: RoflPlayer[];
}

// ─── Raw stat key helpers ─────────────────────────────────────────────────────

function str(stats: Record<string, string>, key: string): string {
  return stats[key] ?? "";
}

function num(stats: Record<string, string>, key: string): number {
  return parseInt(stats[key] ?? "0", 10) || 0;
}

function bool(stats: Record<string, string>, key: string): boolean {
  const v = stats[key]?.toLowerCase();
  return v === "1" || v === "true" || v === "win";
}

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse a ROFL2 replay file from a Buffer.
 *
 * @throws {RoflParseError} on invalid magic bytes, wrong game mode, or missing data
 */
export function parseRofl(data: Buffer): RoflMatch {
  // 1. Validate magic bytes
  if (data.length < 6 || !data.subarray(0, 6).equals(MAGIC)) {
    throw new RoflParseError(
      "Invalid replay file — magic bytes not found. " +
      "Make sure this is a ROFL2 replay from patch 14.11 or later."
    );
  }

  if (data.length < 36) {
    throw new RoflParseError("File too small to be a valid ROFL2 replay.");
  }

  // 2. Read header offsets (little-endian)
  const metadataOffset = data.readUInt32LE(12);
  const metadataLength = data.readUInt32LE(16);

  if (metadataOffset + metadataLength > data.length) {
    throw new RoflParseError("Replay file appears truncated — metadata region out of bounds.");
  }

  // 3. Extract and parse metadata JSON
  const metadataRaw = data.subarray(metadataOffset, metadataOffset + metadataLength);
  let metadata: Record<string, unknown>;
  try {
    metadata = JSON.parse(metadataRaw.toString("utf8"));
  } catch {
    throw new RoflParseError("Could not extract player data from this replay — metadata is corrupt.");
  }

  const gameId = String(metadata["gameId"] ?? "");
  const gameLength = Number(metadata["gameLength"] ?? 0);
  const gameVersion = String(metadata["gameVersion"] ?? "");
  const gameMode = String(metadata["gameMode"] ?? "");
  const mapId = Number(metadata["mapId"] ?? 0);

  // 4. Validate game mode and map
  if (gameMode !== VALID_GAME_MODE || mapId !== VALID_MAP_ID) {
    throw new RoflParseError(
      `This replay is from ${gameMode || "an unknown mode"} on map ${mapId}. ` +
      `Only Summoner's Rift custom games (Classic, map 11) are accepted.`
    );
  }

  // 5. Parse statsJson — it's a double-encoded JSON string inside the metadata
  const statsJsonRaw = metadata["statsJson"];
  if (!statsJsonRaw || typeof statsJsonRaw !== "string") {
    throw new RoflParseError("Could not extract player data from this replay — statsJson missing.");
  }

  let rawStats: Record<string, string>[];
  try {
    rawStats = JSON.parse(statsJsonRaw);
  } catch {
    throw new RoflParseError("Could not extract player data from this replay — statsJson is corrupt.");
  }

  if (!Array.isArray(rawStats) || rawStats.length !== 10) {
    throw new RoflParseError(
      `Expected 10 player entries in replay, found ${Array.isArray(rawStats) ? rawStats.length : 0}. ` +
      `This does not appear to be a 5v5 game.`
    );
  }

  // 6. Map raw stats to typed player objects
  const players: RoflPlayer[] = rawStats.map((s): RoflPlayer => {
    const teamRaw = num(s, "TEAM");
    const team = teamRaw === 200 ? 200 : 100;

    const riotIdGameName = str(s, "RIOT_ID_GAME_NAME");
    const riotIdTagLine = str(s, "RIOT_ID_TAG_LINE");

    return {
      riotIdGameName,
      riotIdTagLine,
      riotId: riotIdTagLine ? `${riotIdGameName}#${riotIdTagLine}` : riotIdGameName,
      puuid: str(s, "PUUID"),
      champion: str(s, "SKIN"),
      team,
      win: bool(s, "WIN"),
      kills: num(s, "CHAMPIONS_KILLED"),
      deaths: num(s, "NUM_DEATHS"),
      assists: num(s, "ASSISTS"),
      cs: num(s, "MINIONS_KILLED"),
      neutralCs: num(s, "NEUTRAL_MINIONS_KILLED"),
      gold: num(s, "GOLD_EARNED"),
      damageToChampions: num(s, "TOTAL_DAMAGE_DEALT_TO_CHAMPIONS"),
      visionScore: num(s, "VISION_SCORE"),
      level: num(s, "LEVEL"),
      teamPosition: str(s, "TEAM_POSITION") || str(s, "INDIVIDUAL_POSITION"),
      item0: num(s, "ITEM0"),
      item1: num(s, "ITEM1"),
      item2: num(s, "ITEM2"),
      item3: num(s, "ITEM3"),
      item4: num(s, "ITEM4"),
      item5: num(s, "ITEM5"),
      item6: num(s, "ITEM6"),
      summonerSpell1: num(s, "SUMMONER_SPELL_1"),
      summonerSpell2: num(s, "SUMMONER_SPELL_2"),
    };
  });

  const blueSide = players.filter((p) => p.team === 100);
  const redSide = players.filter((p) => p.team === 200);

  if (blueSide.length !== 5 || redSide.length !== 5) {
    throw new RoflParseError(
      `Expected 5 players per team, got blue=${blueSide.length} red=${redSide.length}. ` +
      `This does not appear to be a standard 5v5 custom game.`
    );
  }

  return { gameId, gameLength, gameVersion, gameMode, mapId, players, blueSide, redSide };
}

/**
 * Parse a ROFL2 replay file from disk.
 */
export function parseRoflFile(filePath: string): RoflMatch {
  let data: Buffer;
  try {
    data = readFileSync(filePath);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new RoflParseError(`Could not read replay file: ${msg}`);
  }
  return parseRofl(data);
}

// ─── Error type ───────────────────────────────────────────────────────────────

export class RoflParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RoflParseError";
  }
}
