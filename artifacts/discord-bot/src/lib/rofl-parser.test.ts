/**
 * Unit tests for rofl-parser.ts
 *
 * These tests use synthetic Buffers that mimic the ROFL2 binary format,
 * so no actual .rofl file is needed to run them.
 */

import { parseRofl, RoflParseError } from "./rofl-parser.js";

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    RIOT_ID_GAME_NAME: "TestPlayer",
    RIOT_ID_TAG_LINE: "NA1",
    PUUID: "test-puuid-1234",
    SKIN: "Orianna",
    TEAM: "100",
    WIN: "1",
    CHAMPIONS_KILLED: "8",
    NUM_DEATHS: "2",
    ASSISTS: "11",
    MINIONS_KILLED: "245",
    NEUTRAL_MINIONS_KILLED: "12",
    GOLD_EARNED: "18500",
    TOTAL_DAMAGE_DEALT_TO_CHAMPIONS: "28400",
    VISION_SCORE: "42",
    LEVEL: "18",
    TEAM_POSITION: "MIDDLE",
    ITEM0: "3157",
    ITEM1: "3020",
    ITEM2: "4645",
    ITEM3: "3089",
    ITEM4: "3135",
    ITEM5: "3285",
    ITEM6: "3363",
    SUMMONER_SPELL_1: "4",
    SUMMONER_SPELL_2: "14",
    ...overrides,
  };
}

function makePlayers(count = 10): Record<string, string>[] {
  return Array.from({ length: count }, (_, i) =>
    makePlayer({
      RIOT_ID_GAME_NAME: `Player${i + 1}`,
      PUUID: `puuid-${i + 1}`,
      TEAM: i < 5 ? "100" : "200",
      WIN: i < 5 ? "1" : "0",
    })
  );
}

function makeRoflBuffer(overrides: {
  magic?: Buffer;
  gameId?: string;
  gameLength?: number;
  gameVersion?: string;
  gameMode?: string;
  mapId?: number;
  players?: Record<string, string>[];
}): Buffer {
  const {
    magic = Buffer.from([0x52, 0x49, 0x4f, 0x54, 0x02, 0x00]),
    gameId = "12345678901234567",
    gameLength = 1953000,
    gameVersion = "15.6.0.0",
    gameMode = "CLASSIC",
    mapId = 11,
    players = makePlayers(),
  } = overrides;

  const statsJson = JSON.stringify(players);
  const metadata = JSON.stringify({
    gameId,
    gameLength,
    gameVersion,
    gameMode,
    mapId,
    statsJson,
  });
  const metadataBuf = Buffer.from(metadata, "utf8");

  // Header: magic(6) + headerLen(2) + fileLen(4) + metaOffset(4) + metaLen(4) + 4×4 padding
  const headerSize = 6 + 2 + 4 + 4 + 4 + 16;
  const metadataOffset = headerSize;

  const buf = Buffer.alloc(headerSize + metadataBuf.length);
  magic.copy(buf, 0);
  buf.writeUInt16LE(headerSize, 6);
  buf.writeUInt32LE(buf.length, 8);
  buf.writeUInt32LE(metadataOffset, 12);
  buf.writeUInt32LE(metadataBuf.length, 16);
  metadataBuf.copy(buf, metadataOffset);

  return buf;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err: unknown) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected)
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toEqual(expected: T) {
      if (JSON.stringify(actual) !== JSON.stringify(expected))
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    },
    toThrow(ErrorClass: typeof Error, messageSubstring?: string) {
      if (typeof actual !== "function") throw new Error("Expected a function");
      try {
        (actual as () => void)();
        throw new Error("Expected function to throw but it did not");
      } catch (err: unknown) {
        if (!(err instanceof ErrorClass))
          throw new Error(`Expected ${ErrorClass.name}, got ${err instanceof Error ? err.constructor.name : typeof err}`);
        if (messageSubstring && !(err.message.includes(messageSubstring)))
          throw new Error(`Expected error message to include "${messageSubstring}", got: "${err.message}"`);
      }
    },
    toHaveLength(n: number) {
      if ((actual as unknown[]).length !== n)
        throw new Error(`Expected length ${n}, got ${(actual as unknown[]).length}`);
    },
  };
}

console.log("\nrofl-parser unit tests\n");

// Happy path
console.log("Valid file:");

test("parses 10 players from a valid ROFL2 buffer", () => {
  const result = parseRofl(makeRoflBuffer({}));
  expect(result.players).toHaveLength(10);
  expect(result.blueSide).toHaveLength(5);
  expect(result.redSide).toHaveLength(5);
});

test("extracts correct game metadata", () => {
  const result = parseRofl(makeRoflBuffer({
    gameId: "99887766554433221",
    gameLength: 1953000,
    gameVersion: "15.6.0.0",
  }));
  expect(result.gameId).toBe("99887766554433221");
  expect(result.gameLength).toBe(1953000);
  expect(result.gameVersion).toBe("15.6.0.0");
});

test("maps player stats correctly", () => {
  const result = parseRofl(makeRoflBuffer({}));
  const p = result.players[0];
  expect(p.riotIdGameName).toBe("Player1");
  expect(p.riotId).toBe("Player1#NA1");
  expect(p.puuid).toBe("puuid-1");
  expect(p.champion).toBe("Orianna");
  expect(p.team).toBe(100);
  expect(p.win).toBe(true);
  expect(p.kills).toBe(8);
  expect(p.deaths).toBe(2);
  expect(p.assists).toBe(11);
  expect(p.cs).toBe(245);
  expect(p.neutralCs).toBe(12);
  expect(p.gold).toBe(18500);
  expect(p.damageToChampions).toBe(28400);
  expect(p.visionScore).toBe(42);
  expect(p.level).toBe(18);
  expect(p.item0).toBe(3157);
  expect(p.item6).toBe(3363);
});

test("blue side wins when TEAM=100 has WIN=1", () => {
  const result = parseRofl(makeRoflBuffer({}));
  expect(result.blueSide.every((p) => p.win)).toBe(true);
  expect(result.redSide.every((p) => !p.win)).toBe(true);
});

test("constructs riotId from name + tagline", () => {
  const players = makePlayers();
  players[0] = makePlayer({ RIOT_ID_GAME_NAME: "xiNe", RIOT_ID_TAG_LINE: "NA1", TEAM: "100" });
  const result = parseRofl(makeRoflBuffer({ players }));
  expect(result.players[0].riotId).toBe("xiNe#NA1");
});

test("handles missing tagline gracefully", () => {
  const players = makePlayers();
  players[0] = makePlayer({ RIOT_ID_GAME_NAME: "xiNe", RIOT_ID_TAG_LINE: "", TEAM: "100" });
  const result = parseRofl(makeRoflBuffer({ players }));
  expect(result.players[0].riotId).toBe("xiNe");
});

// Validation errors
console.log("\nValidation errors:");

test("throws RoflParseError on wrong magic bytes", () => {
  const badMagic = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  expect(() => parseRofl(makeRoflBuffer({ magic: badMagic }))).toThrow(RoflParseError, "magic bytes");
});

test("throws RoflParseError on ARAM (wrong gameMode)", () => {
  expect(() => parseRofl(makeRoflBuffer({ gameMode: "ARAM" }))).toThrow(RoflParseError, "ARAM");
});

test("throws RoflParseError on Practice Tool", () => {
  expect(() => parseRofl(makeRoflBuffer({ gameMode: "PRACTICETOOL" }))).toThrow(
    RoflParseError,
    "PRACTICETOOL"
  );
});

test("throws RoflParseError on wrong mapId", () => {
  expect(() => parseRofl(makeRoflBuffer({ mapId: 12 }))).toThrow(RoflParseError, "map 12");
});

test("throws RoflParseError when player count is not 10", () => {
  expect(() => parseRofl(makeRoflBuffer({ players: makePlayers(8) }))).toThrow(
    RoflParseError,
    "Expected 10 player entries"
  );
});

test("throws RoflParseError on empty buffer", () => {
  expect(() => parseRofl(Buffer.alloc(0))).toThrow(RoflParseError, "magic bytes");
});

test("throws RoflParseError on truncated buffer", () => {
  expect(() => parseRofl(Buffer.from([0x52, 0x49, 0x4f, 0x54, 0x02, 0x00]))).toThrow(
    RoflParseError,
    "too small"
  );
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
