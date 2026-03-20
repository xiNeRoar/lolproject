# VCLoL — Claude Session Reference

Read this file before every session. Each session is scoped to specific GitHub Issue numbers — read the issue, do the work, commit with `closes #N`.

---

## Project in One Sentence

5v5 team scrim recording platform. Discord bot produces all data (.rofl parse → match record → ELO). Website displays it. Bot is the product; website is the showcase.

**Full PRD:** `docs/PRD_v3.md`
**Bot spec:** `docs/BOT_SPEC.md`
**Schema:** `docs/SCHEMA_CONTRACT.md`
**User journeys:** `docs/USER_JOURNEYS.md`

---

## Absolute Principles

1. **Schema → OpenAPI → codegen → route → page.** Never skip. Never write frontend fetch() by hand.
2. **Every team ELO change writes to `elo_history`.** Reason: `match`, `season_reset`, `manual_admin`, `registration`.
3. **Teams own ELO. Players do not.** `players` table has no ELO columns.
4. **Bot is the only data producer.** All match data from .rofl parse. Admin manual entry is fallback only.
5. **Read source before answering.** Never guess schema or route signatures.
6. **No SSH. Deployment is Portainer only.**

---

## Architecture

```
pnpm monorepo
├── lib/db/src/schema/        ← Drizzle schema (source of truth)
├── lib/api-spec/openapi.yaml ← API contract (source of truth)
├── lib/api-client-react/     ← Generated hooks (never edit directly)
├── artifacts/api-server/     ← Express routes
├── artifacts/vclol/          ← React frontend (Replit owns)
└── artifacts/discord-bot/    ← Bot (Claude owns, not yet built)
```

**After schema change:** `cd lib/db && pnpm run push`
**After OpenAPI change:** `cd lib/api-spec && pnpm run codegen`

---

## Data Model

```
teams (teamElo, wins, losses, isActive, captainPlayerId nullable)
  └── team_members (playerId, role, status: active/inactive)

matches (teamAId, teamBId, visibleAfter, resultSource)
  └── match_players (10 rows: PUUID, champion, KDA, CS, items, win)

elo_history (teamId, elo, delta, reason, matchId)
seasons → matches | events → matches
notifications (playerId, type, dmSent, dmFailed)
admin_actions (adminId, actionType, entityType, entityId, detail)
player_bans (playerId or teamId, reason, banType, expiresAt, isActive)
bot_heartbeats (timestamp — bot writes every 5 min)
```

---

## Auth

**Admin:** `req.session.adminId` — iron-session cookie.
**Player (current stub):** `localStorage.getItem("vclol_player_id")` — being replaced in Issue #7.
**Player (target):** Discord OAuth → `req.session.playerId`. Routes `/auth/discord` + `/auth/discord/callback` already exist.

---

## Visibility Rules

```
match.visibleAfter = null        → public 7 days after createdAt
match.visibleAfter = new Date(0) → always public
match.visibleAfter = 9999-01-01  → permanent private
```

Private match access: player must be active member of teamA or teamB — check `team_members`, NOT `match_players`.
Non-members: return redacted response `{...matchInfo, matchPlayers:[], vods:[], _private:true}` — NOT 403.

---

## Team Lifecycle

- No match in 30 days → `isActive = false` (off leaderboard, data preserved)
- `captainPlayerId` nullable — orphaned team ok, admin assigns new captain
- One player can be on multiple teams simultaneously
- Roster source of truth = .rofl data, not manual entry

---

## Key Constants

```
Seed: Team Alpha id=8, Team Beta id=9. Players ids 39-48. xiNe#NA1=id39.
ELO history: GET /api/elo-history/team/:teamId
Bot status: GET /api/bot-status
gameDuration: milliseconds
```

---

## Ownership

**Claude owns (Replit never edits):**
`lib/db/src/schema/` · `lib/api-spec/openapi.yaml` · `artifacts/api-server/` · `artifacts/discord-bot/` · `docs/` (except replit.md) · `CLAUDE.md`

**Replit owns (Claude never edits):**
`artifacts/vclol/src/pages/` · `artifacts/vclol/src/components/` · `artifacts/vclol/src/hooks/` · `artifacts/vclol/src/lib/` · `artifacts/vclol/src/App.tsx` · `replit.md`

---

## Session Protocol

Scoped to GitHub Issue numbers. Read issue → do work → commit `closes #N`.
Do NOT read archived docs. Do NOT read MIGRATION_PLAN or REMAINING_WORK — deleted.
Replit backend requests → `docs/REQUESTS.md`.
