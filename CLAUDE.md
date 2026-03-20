# VCLoL — Claude Session Reference

## Project in One Sentence

5v5 team scrim recording platform. Discord bot produces all data (.rofl parse → match record → ELO). Website displays it.

**Docs:** `docs/PRD_v3.md` · `docs/BOT_SPEC.md` · `docs/SCHEMA_CONTRACT.md` · `docs/USER_JOURNEYS.md` · `docs/DEPLOYMENT.md`
**Issues:** https://github.com/xiNeRoar/lolproject/issues
**GitHub token:** stored in git remote URL (already configured)

---

## Mandatory Behaviors — Follow Every Session Without Being Told

### 1. Before touching any code

```
git fetch origin variant
git checkout FETCH_HEAD -- .
```

Read the assigned issue(s) completely. Read CLAUDE.md completely. Then start.

### 2. If you discover a problem that has no GitHub Issue

Open one BEFORE fixing it:

```python
import json, urllib.request

TOKEN = # read from git remote: git remote get-url origin | grep -o 'ghp_[^@]*'
REPO = "xiNeRoar/lolproject"

data = json.dumps({
    "title": "[Claude] Short description of problem",
    "labels": ["claude", "backend"],          # + "bug" if applicable
    "milestone": MILESTONE_NUMBER,             # 1=Bot MVP 2=Web V1 3=VOD 4=Polish
    "body": "**Problem:** ...\n\n**What to do:** ...\n\n**Acceptance criteria:**\n- [ ] ..."
}).encode()
req = urllib.request.Request(
    f"https://api.github.com/repos/{REPO}/issues", data=data,
    headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as r:
    issue = json.load(r)
    print(f"Opened #{issue['number']}")
```

Milestone numbers: 1=Bot MVP, 2=Web V1, 3=VOD Pipeline, 4=Polish.

### 3. Commit format — always

```
git add -A
git commit -m "brief description of change

closes #N"    ← every issue you completed
git push origin variant
```

### 4. After completing an issue — update the relevant doc

| What changed | Update this doc |
|---|---|
| Schema (table/column added) | `docs/SCHEMA_CONTRACT.md` |
| Bot command added/changed | `docs/BOT_SPEC.md` |
| New API endpoint | `lib/api-spec/openapi.yaml` → run codegen |
| New env var required | `docs/DEPLOYMENT.md` |
| User journey step count changed | `docs/USER_JOURNEYS.md` |
| Architecture principle changed | `CLAUDE.md` |

Doc updates go in the same commit as the code change.

### 5. Close the issue via commit — never manually

`closes #N` in commit message automatically closes the issue when pushed.

### 6. If Replit left a request in docs/REQUESTS.md

Read it, open a GitHub Issue for it, do the work, commit `closes #N`, clear the request from REQUESTS.md.

---

## Absolute Principles

1. **Schema → OpenAPI → codegen → route → page.** Never skip. Never write frontend fetch() by hand.
2. **Every team ELO change writes to `elo_history`.** Reason: `match`, `season_reset`, `manual_admin`, `registration`.
3. **Teams own ELO. Players do not.**
4. **Bot is the only data producer.** All match data from .rofl parse.
5. **Read source before answering.** Never guess schema or route signatures.
6. **No SSH. Portainer only.**

---

## Architecture

```
pnpm monorepo
├── lib/db/src/schema/        ← Drizzle schema (source of truth)
├── lib/api-spec/openapi.yaml ← API contract (source of truth)
├── lib/api-client-react/     ← Generated hooks (never edit directly)
├── artifacts/api-server/     ← Express routes
├── artifacts/vclol/          ← React frontend (Replit owns)
└── artifacts/discord-bot/    ← Bot (Claude owns)
```

**After schema change:** `cd lib/db && pnpm run generate` then `pnpm run migrate`
**After OpenAPI change:** `cd lib/api-spec && pnpm run codegen`

---

## Data Model

```
teams (teamElo, wins, losses, isActive, captainPlayerId nullable, lastMatchAt)
  └── team_members (playerId, role, status: active/inactive)

matches (teamAId, teamBId, visibleAfter, resultSource, roflFilePath)
  └── match_players (10 rows: PUUID, champion, KDA, CS, items, win)

elo_history (teamId, elo, delta, reason, matchId)
seasons → matches | events → matches
notifications (playerId, type, dmSent, dmFailed)
admin_actions (adminId, actionType, entityType, entityId, detail)
player_bans (playerId or teamId, reason, banType, expiresAt, isActive)
bot_heartbeats (timestamp)
```

---

## Auth

**Admin:** `req.session.adminId` (iron-session)
**Player (stub):** localStorage — being replaced in Issue #7
**Player (target):** Discord OAuth → `req.session.playerId`
Routes `/auth/discord` + `/auth/discord/callback` already exist.

---

## Visibility Rules

```
match.visibleAfter = null        → public 7 days after createdAt
match.visibleAfter = new Date(0) → always public
match.visibleAfter = 9999-01-01  → permanent private
```

Private match access: check `team_members` (NOT `match_players`).
Non-members get redacted response `{...match, matchPlayers:[], vods:[], _private:true}` — never 403.

---

## Key Constants

```
Seed: Team Alpha id=8, Beta id=9. Players 39-48. xiNe#NA1=id39.
ELO history: GET /api/elo-history/team/:teamId
gameDuration: milliseconds
```

---

## Ownership

**Claude owns:** `lib/db/src/schema/` · `lib/api-spec/openapi.yaml` · `artifacts/api-server/` · `artifacts/discord-bot/` · `docs/` (except replit.md) · `CLAUDE.md`

**Replit owns:** `artifacts/vclol/src/` · `replit.md`

**Never edit each other's files.**

---

## Issue Priority Order (when no specific issue assigned)

Work top-to-bottom within the current milestone. Current milestone = lowest-numbered incomplete milestone.

```
Bot MVP:  #1 → #2 → #3 #4 #6 (parallel) → #5 (needs #1+#2) → #24 #25 #27 (parallel) → #26 (needs #14)
Web V1:   #8 #9 #10 #11 #12 #13 #28 #29 #31 (parallel) → #14 → #30
VOD:      #19
Polish:   #20 #21 (parallel)
```
