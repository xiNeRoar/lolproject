# Testing Patterns

**Analysis Date:** 2026-03-26

## Test Framework

**Runner:**
- No test framework installed (no Jest, Vitest, Mocha, or similar)
- Single test file uses a custom hand-rolled test runner
- Config: None -- no `jest.config.*`, `vitest.config.*`, or similar config files exist

**Assertion Library:**
- Custom `expect()` function defined inline in the test file
- Supports: `toBe()`, `toEqual()`, `toThrow()`, `toHaveLength()`

**Run Commands:**
```bash
npx tsx artifacts/discord-bot/src/lib/rofl-parser.test.ts   # Run the only test file
pnpm run typecheck                                           # TypeScript type checking (closest to CI validation)
pnpm run build                                               # Full build (typecheck + compile)
```

## Test File Organization

**Location:**
- Co-located with source: test file lives next to implementation file
- Only one test file exists in the entire codebase

**Naming:**
- `{module-name}.test.ts` pattern

**Existing Test Files:**
```
artifacts/discord-bot/src/lib/rofl-parser.test.ts   # ROFL binary parser unit tests
```

**Untested Modules (no test files):**
- All API server routes (`artifacts/api-server/src/routes/*.ts`)
- All other bot commands (`artifacts/discord-bot/src/commands/*.ts`)
- All bot lib modules (`artifacts/discord-bot/src/lib/*.ts` except rofl-parser)
- All shared libraries (`lib/rofl-parse/src/*.ts`, `lib/db/src/*.ts`)
- ELO calculation (`lib/rofl-parse/src/elo.ts`)
- Team matcher (`lib/rofl-parse/src/team-matcher.ts`)

## Test Structure

**Suite Organization:**

The single test file (`artifacts/discord-bot/src/lib/rofl-parser.test.ts`) uses a custom runner pattern:

```typescript
// Custom test runner (no framework dependency)
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  [pass] ${name}`);
    passed++;
  } catch (err: unknown) {
    console.log(`  [fail] ${name}`);
    console.log(`     ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

function expect<T>(actual: T) {
  return {
    toBe(expected: T) { /* strict equality */ },
    toEqual(expected: T) { /* JSON deep equality */ },
    toThrow(ErrorClass: typeof Error, messageSubstring?: string) { /* throws check */ },
    toHaveLength(n: number) { /* array length check */ },
  };
}
```

**Patterns:**
- Tests grouped by console.log section headers: `"Valid file:"`, `"Validation errors:"`
- No setup/teardown hooks (no beforeEach/afterEach)
- Synchronous tests only (parser is synchronous)
- Exit code 1 on failure: `if (failed > 0) process.exit(1)`

## Mocking

**Framework:** None

**Patterns:**
- No mocking framework installed or used
- The rofl-parser test creates synthetic `Buffer` objects that mimic the ROFL2 binary format
- Test helpers construct fake data without touching the database or network

```typescript
// Test data factory pattern (from artifacts/discord-bot/src/lib/rofl-parser.test.ts)
function makePlayer(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    RIOT_ID_GAME_NAME: "TestPlayer",
    RIOT_ID_TAG_LINE: "NA1",
    PUUID: "test-puuid-1234",
    SKIN: "Orianna",
    TEAM: "100",
    WIN: "1",
    // ... more defaults ...
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
```

**What to Mock (if adding tests):**
- Database calls (`db` from `@workspace/db`) -- all commands and routes use direct DB queries
- Discord.js interaction objects (`ChatInputCommandInteraction`)
- External HTTP calls (Discord API, Riot RSO OAuth, Riot API)
- File system operations (`.rofl` file downloads/writes)

**What NOT to Mock:**
- Pure functions: `parseRofl()`, `calculateElo()`, `formatDuration()`, `buildSideName()`
- Drizzle schema definitions
- Zod validation schemas

## Fixtures and Factories

**Test Data:**

The only factory pattern is the `makeRoflBuffer()` function that creates synthetic ROFL2 binary buffers:

```typescript
// From artifacts/discord-bot/src/lib/rofl-parser.test.ts
function makeRoflBuffer(overrides: {
  magic?: Buffer;
  gameId?: string;
  gameLength?: number;
  gameVersion?: string;
  gameMode?: string;
  mapId?: number;
  players?: Record<string, string>[];
}): Buffer {
  // Constructs a valid ROFL2 binary buffer with header + JSON metadata
  // Supports overriding any field for error-case testing
}
```

**Seed Data:**
- `scripts/src/seed.ts` -- database seeding script (not test fixtures)
- Seed constants documented in `CLAUDE.md`: Team Alpha id=8, Beta id=9, Players 39-48

**Location:**
- No dedicated fixtures directory
- Factory functions inline in test file

## Coverage

**Requirements:** None enforced. No coverage tooling configured.

**View Coverage:** Not available -- no coverage tool installed.

## Test Types

**Unit Tests:**
- One file: `artifacts/discord-bot/src/lib/rofl-parser.test.ts`
- Tests the ROFL2 binary parser: valid parsing, metadata extraction, player stat mapping, error cases
- 13 test cases covering happy path (7) and validation errors (6)
- Purely synchronous, no DB or network dependencies

**Integration Tests:**
- None exist
- No database integration tests
- No API endpoint tests

**E2E Tests:**
- Not used
- No Playwright, Cypress, or similar framework

## Common Patterns

**Async Testing:**
Not applicable -- the only existing tests are synchronous. If adding async tests:

```typescript
// Recommended pattern for future async tests (based on codebase conventions)
async function testAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  [pass] ${name}`);
    passed++;
  } catch (err: unknown) {
    console.log(`  [fail] ${name}`);
    console.log(`     ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}
```

**Error Testing:**

```typescript
// From artifacts/discord-bot/src/lib/rofl-parser.test.ts
test("throws RoflParseError on wrong magic bytes", () => {
  const badMagic = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  expect(() => parseRofl(makeRoflBuffer({ magic: badMagic }))).toThrow(RoflParseError, "magic bytes");
});

test("throws RoflParseError on ARAM (wrong gameMode)", () => {
  expect(() => parseRofl(makeRoflBuffer({ gameMode: "ARAM" }))).toThrow(RoflParseError, "ARAM");
});
```

## Type Checking as Test Substitute

The primary quality gate is TypeScript type checking, not unit tests:

```bash
pnpm run typecheck        # Runs tsc --build for libs, then tsc --noEmit for artifacts
pnpm run typecheck:libs   # Just the shared libraries (lib/db, lib/api-zod, lib/api-client-react)
```

Key strictness settings that catch bugs at compile time:
- `strictNullChecks: true` -- prevents null reference errors
- `noImplicitAny: true` -- requires explicit types
- `noImplicitReturns: true` -- catches missing return paths
- `useUnknownInCatchVariables: true` -- forces error type narrowing

## Recommendations for Adding Tests

**High-priority modules to test (pure logic, no DB):**
- `lib/rofl-parse/src/elo.ts` -- ELO calculation (`calculateElo`, `softResetElo`)
- `lib/rofl-parse/src/team-matcher.ts` -- team matching algorithm
- `lib/rofl-parse/src/rofl-parser.ts` -- shared parser (currently only bot copy is tested)
- `artifacts/api-server/src/lib/badges.ts` -- badge computation

**If adding a test framework:**
- Vitest recommended (native ESM support, compatible with existing `tsconfig` settings)
- Install at workspace root: `pnpm add -Dw vitest`
- Co-locate tests with source: `{module}.test.ts` (matches existing convention)

---

*Testing analysis: 2026-03-26*
