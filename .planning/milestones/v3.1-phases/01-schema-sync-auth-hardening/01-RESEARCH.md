# Phase 1: Schema Sync & Auth Hardening - Research

**Researched:** 2026-03-26
**Domain:** Drizzle ORM schema synchronization, OAuth CSRF prevention, Express session/CORS hardening
**Confidence:** HIGH

## Summary

Phase 1 addresses two foundational issues: (1) the production PostgreSQL database is out of sync with the Drizzle ORM schema (confirmed P0 -- `match_type` column missing, likely others), and (2) the OAuth flows for both Discord and RSO lack CSRF protection and the CORS policy is wide open with credentials enabled.

The codebase already has all schema files correctly defined in `lib/db/src/schema/`. The gap is purely at the database level -- `drizzle-kit push` will resolve it. Auth hardening requires adding OAuth `state` parameters, tightening CORS, removing RSO token persistence, adding session secret validation, and fixing the visibility endpoint's playerId spoofing vulnerability.

**Primary recommendation:** Run `drizzle-kit push` first (unblocks everything), then harden auth flows in a single pass since all changes are in `auth.ts` and `app.ts`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Remove `playerId` from SCHEMA_CONTRACT.md eloHistory to match actual code. PRD v3.1 confirms team-only ELO. Player-match relationships available via JOIN through `elo_history -> matchId -> match_players -> playerId`.
- **D-05:** Keep `rsoAccessToken` and `rsoRefreshToken` schema columns but do NOT populate them in auth flow. Only persist PUUID. Add code comment linking to Tournament API future requirement.

### Claude's Discretion
- **D-02:** Schema sync approach (drizzle-kit push for dev, generate+migrate for production)
- **D-03:** OAuth state parameter implementation (crypto random, stored in session, validated on callback)
- **D-04:** CORS restricted to PLATFORM_URL + localhost for dev
- **D-06:** Session secret startup validation (refuse to start with default in production)
- **D-07:** Visibility endpoint derives playerId from session, not request body

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SCHM-01 | Database schema synced with Drizzle ORM -- all columns exist in production | drizzle-kit push resolves all missing columns in one operation; verified missing columns list from REQUESTS.md #221 |
| SCHM-02 | eloHistory.playerId decision resolved | Code already has no playerId (teamId is notNull); SCHEMA_CONTRACT.md needs updating to match |
| AUTH-01 | RSO OAuth state parameter on both Discord and RSO flows | Standard OWASP pattern: crypto.randomBytes -> session -> validate on callback |
| AUTH-02 | CORS restricted to production domain | Current code uses `origin: true` with `credentials: true` -- must restrict to PLATFORM_URL |
| AUTH-03 | RSO token storage resolved -- keep columns, don't populate | Lines 261-262 and 281-282 in auth.ts currently write tokens; change to null with TODO comment |
| AUTH-04 | Session secret enforced as non-default in production | Current default is "vclol-admin-secret-2024" in app.ts line 37; add startup check |
| AUTH-05 | Match visibility endpoint rejects spoofed playerId | Line 791 in matches.ts falls back to `req.body.playerId` -- must use only session |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | catalog (workspace) | ORM and query builder | Already project standard; schema is source of truth |
| drizzle-kit | ^0.31.9 | Schema push/migrate CLI | Already configured in lib/db/drizzle.config.ts |
| express-session | ^1.19.0 | Session management | Already in use; state param stored here |
| cors | ^2 | CORS middleware | Already in use; needs config change only |

### Supporting (built-in Node.js)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| node:crypto | built-in | Generate OAuth state tokens | `crypto.randomBytes(32).toString('hex')` for state param |

### No New Dependencies
This phase requires zero new npm packages. All work uses existing dependencies plus Node.js built-in `crypto`.

## Architecture Patterns

### Pattern 1: OAuth State Parameter (CSRF Prevention)
**What:** Generate a cryptographic random string, store it in the session before redirecting to the OAuth provider, then validate it matches on the callback.
**When to use:** Every OAuth initiation endpoint (Discord `/auth/discord`, RSO `/auth/rso`, RSO `/auth/connect/:token`).

**Example:**
```typescript
import crypto from "node:crypto";

// In OAuth initiation:
const state = crypto.randomBytes(32).toString("hex");
req.session.oauthState = state;
// Add state to OAuth URL params
params.set("state", state);

// In OAuth callback:
const state = req.query.state as string;
if (!state || state !== req.session.oauthState) {
  res.status(403).json({ error: "Invalid OAuth state" });
  return;
}
delete req.session.oauthState;
// Proceed with code exchange...
```

**Source:** OWASP OAuth Security Cheat Sheet -- standard pattern for all OAuth 2.0 flows.

### Pattern 2: CORS Allowlist
**What:** Replace `origin: true` (reflects any origin) with an explicit allowlist.
**When to use:** `app.ts` CORS configuration.

**Example:**
```typescript
const PLATFORM_URL = process.env.PLATFORM_URL || "http://localhost:5173";

const allowedOrigins = [
  PLATFORM_URL,
  // Development origins
  ...(!isProduction ? ["http://localhost:5173", "http://localhost:3000"] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
```

### Pattern 3: Session Secret Startup Validation
**What:** Check that SESSION_SECRET is not the hardcoded default when running in production.
**When to use:** Server startup in `app.ts` or the entry point.

**Example:**
```typescript
const DEFAULT_SECRET = "vclol-admin-secret-2024";
const sessionSecret = process.env.SESSION_SECRET || DEFAULT_SECRET;

if (isProduction && sessionSecret === DEFAULT_SECRET) {
  console.error(
    "[FATAL] SESSION_SECRET is using the default dev value in production. " +
    "Set SESSION_SECRET to a cryptographically random string. " +
    "Generate one: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
  process.exit(1);
}
```

### Pattern 4: Session-Only Authorization (No Body Trust)
**What:** Derive identity exclusively from the server-managed session, never from request body.
**When to use:** Any endpoint that checks "who is the current user."

**Current vulnerable code (matches.ts line 791):**
```typescript
// BAD: falls back to body -- attacker can spoof
const playerId = req.session.playerId || (req.body as any).playerId;
```

**Fix:**
```typescript
// GOOD: session only -- server-managed, not user-controllable
const playerId = req.session.playerId;
if (!playerId) {
  res.status(401).json({ error: "Login required" });
  return;
}
```

### Anti-Patterns to Avoid
- **`origin: true` with `credentials: true`:** Reflects any origin in Access-Control-Allow-Origin while allowing cookies. This is equivalent to `*` with credentials -- a security vulnerability.
- **Storing OAuth tokens you don't need:** RSO access/refresh tokens are written to DB but never used. Remove writes; keep columns for future Tournament API use.
- **Trusting request body for identity:** Any field in `req.body` can be forged by the client. Identity must come from server-side session.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSRF token generation | Custom random function | `crypto.randomBytes(32).toString('hex')` | Cryptographically secure, no edge cases |
| Schema sync detection | Manual column comparison | `drizzle-kit push` (interactive) | Handles all column types, defaults, nullability |
| CORS origin matching | String comparison with regex | `cors` package `origin` callback | Handles preflight, varies headers correctly |

## Common Pitfalls

### Pitfall 1: drizzle-kit push Destructive Prompts
**What goes wrong:** `drizzle-kit push` may prompt to "rename" a column when it should "create" a new one. Selecting "rename" drops the existing column's data.
**Why it happens:** Drizzle's diff algorithm sometimes interprets a new column + removed column as a rename operation.
**How to avoid:** When prompted about `match_type` or `tournament_code`, always select "create column" (not rename). The REQUESTS.md #221 entry explicitly warns about this.
**Warning signs:** The push command asks "Do you want to rename X to Y?" -- this is nearly always wrong for schema sync.

### Pitfall 2: OAuth State Stored in Wrong Session Scope
**What goes wrong:** The `/auth/connect/:token` flow already stores `connectToken` and `connectDiscordId` in the session. If the OAuth state key collides or the session is not saved before redirect, the state is lost.
**Why it happens:** `express-session` with `saveUninitialized: false` may not persist a new session until a response is sent. But `res.redirect()` does trigger session save.
**How to avoid:** Use a single `oauthState` key in the session (not separate per provider). The redirect triggers save. Add the `state` field to the `SessionData` type declaration in `session.ts`.

### Pitfall 3: CORS Blocks Legitimate Requests
**What goes wrong:** After tightening CORS, the frontend cannot reach the API because `PLATFORM_URL` doesn't match the actual origin (e.g., trailing slash, http vs https, port mismatch).
**Why it happens:** CORS origin matching is exact string comparison. `http://example.com` !== `http://example.com/`.
**How to avoid:** Strip trailing slashes from `PLATFORM_URL`. Log rejected origins in development. Include both localhost ports (5173 for Vite dev, 3000 for API) in dev mode.

### Pitfall 4: Session Type Declaration Missing New Fields
**What goes wrong:** TypeScript compilation fails because `oauthState` is not declared on `SessionData`.
**Why it happens:** The session type augmentation in `lib/session.ts` must be updated when adding new session fields.
**How to avoid:** Add `oauthState?: string;` to the `SessionData` interface in `artifacts/api-server/src/lib/session.ts`.

### Pitfall 5: Token Columns Left in INSERT/UPDATE Statements
**What goes wrong:** RSO tokens still written to DB despite decision D-05 to stop writing them.
**Why it happens:** Two code paths write tokens: the "update existing player" path (auth.ts ~line 261) and the "create new player" path (~line 281).
**How to avoid:** Remove `rsoAccessToken` and `rsoRefreshToken` from both `.set()` and `.values()` calls. Keep the schema columns (D-05). Add a TODO comment.

## Code Examples

### Exact Lines to Change in auth.ts

**Discord OAuth initiation (line 20-28) -- add state:**
```typescript
router.get("/discord", (req, res) => {
  const state = crypto.randomBytes(32).toString("hex");
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify email",
    state,
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});
```

**Discord callback (line 31-32) -- validate state:**
```typescript
router.get("/discord/callback", async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  if (!code || !state || state !== req.session.oauthState) {
    res.status(403).json({ error: "Invalid OAuth state" });
    return;
  }
  delete req.session.oauthState;
  // ... rest of handler
```

**RSO token removal (auth.ts ~line 256-267) -- stop writing tokens:**
```typescript
// Update existing player -- only persist PUUID, not tokens
await db
  .update(playersTable)
  .set({
    puuid: account.puuid,
    riotId,
    rsoOptIn: true,
    // TODO: Tournament API integration requires encrypted token storage
    // See PROJECT.md Key Decisions. Columns kept for future use.
    rsoAccessToken: null,
    rsoRefreshToken: null,
    rsoLinkedAt: now,
    discordId: discordId ?? player.discordId,
    updatedAt: now,
  })
  .where(eq(playersTable.id, player.id));
```

**Visibility endpoint fix (matches.ts ~line 791):**
```typescript
// BEFORE (vulnerable):
const playerId = req.session.playerId || (req.body as any).playerId;

// AFTER (secure):
const playerId = req.session.playerId;
if (!playerId) {
  res.status(401).json({ error: "Login required to change visibility" });
  return;
}
```

### Session Type Update (session.ts)
```typescript
declare module "express-session" {
  interface SessionData {
    adminId?: number;
    adminEmail?: string;
    playerId?: number;
    playerRiotId?: string;
    discordId?: string;
    discordUsername?: string;
    connectToken?: string;
    connectDiscordId?: string;
    oauthState?: string;        // NEW: CSRF state for OAuth flows
  }
}
```

### SCHEMA_CONTRACT.md eloHistory Fix (D-01)
```typescript
// BEFORE (in SCHEMA_CONTRACT.md):
export const eloHistoryTable = pgTable("elo_history", {
  // ...
  teamId: integer("team_id").references(...),
  playerId: integer("player_id").references(...),  // REMOVE THIS LINE
  // ...
});

// AFTER (matches actual code in eloHistory.ts):
export const eloHistoryTable = pgTable("elo_history", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  elo: integer("elo").notNull(),
  delta: integer("delta").notNull().default(0),
  matchId: integer("match_id").references(() => matchesTable.id, { onDelete: "set null" }),
  reason: text("reason").notNull().default("match"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `origin: true` CORS | Explicit origin allowlist | OWASP standard | Prevents credential leakage to arbitrary origins |
| No OAuth state param | Cryptographic state in session | OAuth 2.0 spec since RFC 6749 | Prevents CSRF account hijacking |
| Store RSO tokens | Persist only PUUID | Project decision D-05 | Reduces token leakage surface; columns retained for future Tournament API |

## Open Questions

1. **Database backup before push**
   - What we know: DEPLOYMENT.md mentions backup guidance. Production runs in Docker (PostgreSQL 16).
   - What's unclear: Whether the planner should include a backup step or if that's operational.
   - Recommendation: Include a `pg_dump` command as the first task action before any schema push. It's cheap insurance.

2. **Other missing columns beyond match_type**
   - What we know: REQUESTS.md confirms `match_type` is missing. The verified columns list shows `tournament_code` is also missing. Other tables may have gaps too.
   - What's unclear: Full list of all missing columns across all tables.
   - Recommendation: `drizzle-kit push` will surface all gaps interactively. Plan should note the operator must review each prompt carefully.

## Project Constraints (from CLAUDE.md)

- **Schema change workflow:** Edit schema file -> `pnpm run generate` -> `pnpm run migrate` (for production). `drizzle-kit push` for dev.
- **Doc updates required:** SCHEMA_CONTRACT.md must be updated in the same commit when schema changes (STEP 3 table).
- **Ownership boundary:** Claude owns `lib/db/src/schema/`, `artifacts/api-server/`, `docs/`. Never edit `artifacts/vclol/src/`.
- **RSO tokens:** Keep columns, do not populate. Only PUUID persisted.
- **ELO is team-only:** No player ELO. eloHistory has no playerId column in code.
- **Session-based auth:** express-session, not JWT. Admin uses `req.session.adminId`, player uses `req.session.playerId`.
- **Docker deploy:** Portainer only, no SSH. Container auto-clones variant branch on restart.

## Sources

### Primary (HIGH confidence)
- `artifacts/api-server/src/routes/auth.ts` -- Current OAuth implementation (331 lines), directly inspected
- `artifacts/api-server/src/app.ts` -- CORS config (`origin: true`) and session setup, directly inspected
- `artifacts/api-server/src/routes/matches.ts` -- Visibility endpoint with body.playerId fallback (line 791), directly inspected
- `lib/db/src/schema/eloHistory.ts` -- Confirms no playerId column in code, directly inspected
- `lib/db/src/schema/players.ts` -- Confirms RSO token columns exist in schema, directly inspected
- `docs/REQUESTS.md` -- #221 P0 schema sync issue with verified column list
- `docs/DEPLOYMENT.md` -- SESSION_SECRET requirements and schema change workflow
- `docs/SCHEMA_CONTRACT.md` -- Full table definitions (still has stale playerId in eloHistory)
- `artifacts/api-server/src/lib/session.ts` -- SessionData type augmentation

### Secondary (MEDIUM confidence)
- OAuth state parameter pattern from OWASP OAuth Security guidelines (well-established standard)
- CORS `origin: true` behavior from `cors` npm package documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, no new dependencies
- Architecture: HIGH -- patterns are OWASP standard, code locations identified with line numbers
- Pitfalls: HIGH -- vulnerabilities confirmed by direct code inspection

**Research date:** 2026-03-26
**Valid until:** 2026-04-26 (stable -- no fast-moving dependencies)
