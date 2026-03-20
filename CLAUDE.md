# VCLoL — Claude Session Reference

## Project in One Sentence

5v5 team scrim recording platform. Discord bot produces all data (.rofl parse → match record → ELO). Website displays it.

**Docs:** `docs/PRD_v3.md` · `docs/BOT_SPEC.md` · `docs/SCHEMA_CONTRACT.md` · `docs/USER_JOURNEYS.md` · `docs/DEPLOYMENT.md`

---

## Step 0 — Run this at the start of EVERY session (no exceptions)

```python
import json, urllib.request, subprocess, re

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'",
    shell=True
).decode().strip()
REPO = "xiNeRoar/lolproject"

def gh(path):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/{path}",
        headers={"Authorization": f"token {TOKEN}", "Accept": "application/vnd.github.v3+json"}
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)

open_issues = gh("issues?state=open&per_page=50")
closed = {i['number'] for i in gh("issues?state=closed&per_page=100")}

mine = [i for i in open_issues if "claude" in [l['name'] for l in i['labels']]]
mine.sort(key=lambda i: ((i.get('milestone') or {}).get('number', 99), i['number']))

def blocked(issue):
    refs = re.findall(r'[Bb]locked by[:\s#]+(\d+)', issue.get('body', '') or '')
    return any(int(n) not in closed for n in refs)

next_issue = next((i for i in mine if not blocked(i)), None)

if next_issue:
    ms = (next_issue.get('milestone') or {}).get('title', 'none')
    print(f"NEXT: #{next_issue['number']} [{ms}] {next_issue['title']}")
    print(f"URL: {next_issue['html_url']}")
else:
    print("No unblocked Claude issues. All done or waiting on Replit.")
```

Then fetch latest code:
```bash
git fetch origin variant && git checkout FETCH_HEAD -- .
```

**Read the issue completely. Then start work.**

---

## Step 1 — If you discover a problem that has NO issue yet

Open one BEFORE fixing it:

```python
import json, urllib.request, subprocess

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'", shell=True
).decode().strip()

data = json.dumps({
    "title": "[Claude] One-line description",
    "labels": ["claude", "backend"],   # add "bug" if applicable
    "milestone": 2,                    # 1=Bot MVP 2=Web V1 3=VOD 4=Polish
    "body": "**Problem:** ...\n\n**What to do:** ...\n\n**Acceptance criteria:**\n- [ ] ..."
}).encode()

req = urllib.request.Request(
    f"https://api.github.com/repos/xiNeRoar/lolproject/issues", data=data,
    headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as r:
    d = json.load(r)
    print(f"Opened #{d['number']}: {d['title']}")
```

---

## Step 2 — Commit format (every time)

```bash
git add -A
git commit -m "short description

closes #N"      ← this automatically closes the issue
git push origin variant
```

---

## Step 3 — After completing an issue, update the relevant doc in the same commit

| What changed | Update this |
|---|---|
| Schema column/table added | `docs/SCHEMA_CONTRACT.md` |
| Bot command added/changed | `docs/BOT_SPEC.md` |
| New API endpoint | `lib/api-spec/openapi.yaml` → run codegen |
| New env var | `docs/DEPLOYMENT.md` |
| User journey step count changed | `docs/USER_JOURNEYS.md` |

---

## Step 4 — Check docs/REQUESTS.md each session

If Replit left a backend request: open a GitHub Issue for it, do the work, clear the entry from REQUESTS.md. All in one commit.

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
elo_history · seasons · events · notifications · admin_actions · player_bans · bot_heartbeats
```

---

## Auth

**Admin:** `req.session.adminId` (iron-session)
**Player (stub):** localStorage → being replaced in Issue #7
**Player (target):** Discord OAuth → `req.session.playerId`

---

## Visibility Rules

```
visibleAfter = null        → public 7 days after createdAt
visibleAfter = new Date(0) → always public
visibleAfter = 9999-01-01  → permanent private
```

Private match: check `team_members` (NOT `match_players`). Non-members get `{...match, matchPlayers:[], vods:[], _private:true}` — never 403.

---

## Ownership

**Claude owns:** `lib/db/src/schema/` · `lib/api-spec/openapi.yaml` · `artifacts/api-server/` · `artifacts/discord-bot/` · `docs/` (except replit.md) · `CLAUDE.md`

**Replit owns:** `artifacts/vclol/src/` · `replit.md`

**Never edit each other's files.**

---

## Key Constants

```
Seed: Team Alpha id=8, Beta id=9. Players 39-48. xiNe#NA1=id39.
ELO history: GET /api/elo-history/team/:teamId
gameDuration: milliseconds
```
