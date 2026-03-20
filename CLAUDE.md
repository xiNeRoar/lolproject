# VCLoL — Claude Session Reference

## Project in One Sentence

5v5 team scrim recording platform. Discord bot produces all data (.rofl parse → match record → ELO). Website displays it.

**Docs:** `docs/PRD_v3.md` · `docs/BOT_SPEC.md` · `docs/SCHEMA_CONTRACT.md` · `docs/USER_JOURNEYS.md` · `docs/DEPLOYMENT.md`

---

## MANDATORY: Run at the start of every session before anything else

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
else:
    print("No unblocked Claude issues.")
    for i in mine: print(f"  BLOCKED: #{i['number']} {i['title']}")
```

Then: `git fetch origin variant && git checkout FETCH_HEAD -- .`

Read the issue completely. Then start.

---

## MANDATORY: When you find ANY problem, gap, or improvement during work

**Do not fix silently. Open a GitHub Issue first, every time.**

```python
import json, urllib.request, subprocess

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'", shell=True
).decode().strip()

data = json.dumps({
    "title": "[Claude] One-line description",
    "labels": ["claude", "backend"],   # add "bug" if it's a bug
    "milestone": 2,                    # 1=Bot MVP 2=Web V1 3=VOD 4=Polish
    "body": "**Problem:** ...\n\n**What to do:** ...\n\n**Acceptance criteria:**\n- [ ] ..."
}).encode()
req = urllib.request.Request(
    "https://api.github.com/repos/xiNeRoar/lolproject/issues", data=data,
    headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as r:
    d = json.load(r)
    print(f"Opened #{d['number']}: {d['title']}")
```

This applies to: bugs you notice, missing features, doc gaps, security issues, performance problems — anything. If it's worth fixing, it needs an issue first.
If the problem is **directly related to the issue you are currently working on** (e.g. you discovered a sub-bug, a missing edge case, or a clarification needed), **comment on that issue first** before opening a new one:

```python
import json, urllib.request, subprocess

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'", shell=True
).decode().strip()

ISSUE_NUMBER = N  # the issue you are currently working on

data = json.dumps({
    "body": "**Found during implementation:**\n\n[describe what you found]\n\n**Decision:** [fix inline / opening new issue #N / blocked until X]"
}).encode()
req = urllib.request.Request(
    f"https://api.github.com/repos/xiNeRoar/lolproject/issues/{ISSUE_NUMBER}/comments",
    data=data,
    headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as r:
    d = json.load(r); print(f"Commented on #{ISSUE_NUMBER}")
```

**Rule:**
- Problem is a sub-task or edge case of the current issue → **comment on current issue**
- Problem is independent / different area of codebase → **open new issue** with `Related to #N` in body
- Both can apply: comment first, then open new issue referencing the comment



---

## MANDATORY: Commit format — every time

```bash
git add -A
git commit -m "short description of what changed

closes #N"      ← automatically closes the issue on GitHub
git push origin variant
```

---

## MANDATORY: After every issue — update docs in the same commit

Every completed issue requires updating the corresponding doc. No exceptions.

| What changed | Update this file |
|---|---|
| Schema column or table added/changed | `docs/SCHEMA_CONTRACT.md` |
| Bot command added, changed, or clarified | `docs/BOT_SPEC.md` |
| New or changed API endpoint | `lib/api-spec/openapi.yaml` → run codegen |
| New environment variable required | `docs/DEPLOYMENT.md` |
| User journey step count improved | `docs/USER_JOURNEYS.md` |
| Architecture principle changed | `CLAUDE.md` itself |
| Ownership rule changed | `CLAUDE.md` itself |

**CLAUDE.md is a living document.** If you learn something that should change how future sessions work — a principle, a constant, a rule — update CLAUDE.md in the same commit. You own this file.

---

## MANDATORY: Check docs/REQUESTS.md each session

If Replit left a backend request: open a GitHub Issue for it, do the work, clear the entry from REQUESTS.md. All in one commit.

---

## Absolute Principles

1. **Schema → OpenAPI → codegen → route → page.** Never skip. Never write frontend fetch() by hand.
2. **Every team ELO change writes to `elo_history`.** Reason: `match`, `season_reset`, `manual_admin`, `registration`.
3. **Teams own ELO. Players do not.**
4. **Bot is the only data producer.** All match data from .rofl parse.
5. **Read actual source files before answering.** Never guess schema or route signatures.
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

Private match access: check `team_members` (NOT `match_players`).
Non-members get `{...match, matchPlayers:[], vods:[], _private:true}` — never 403.

---

## Ownership

**Claude owns (Replit never edits):**
`lib/db/src/schema/` · `lib/api-spec/openapi.yaml` · `artifacts/api-server/` · `artifacts/discord-bot/` · `docs/` (except replit.md) · `CLAUDE.md`

**Replit owns (Claude never edits):**
`artifacts/vclol/src/` · `replit.md`

---

## Key Constants

```
Seed: Team Alpha id=8, Beta id=9. Players 39-48. xiNe#NA1=id39.
ELO history: GET /api/elo-history/team/:teamId
gameDuration: milliseconds
```
