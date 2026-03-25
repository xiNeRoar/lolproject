# VCLoL — Claude Session Reference

## Project in One Sentence

5v5 team scrim recording platform. Discord bot submits .rofl → match record. Website displays it. RSO = identity layer (launch requirement). ELO only for tournament/event matches.

**Docs:** `docs/PRD_v3.md` · `docs/BOT_SPEC.md` · `docs/SCHEMA_CONTRACT.md` · `docs/USER_JOURNEYS.md` · `docs/DEPLOYMENT.md`

---

## STEP 0 — Run at the start of every session (mandatory, no exceptions)

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
    print("No unblocked Claude issues.")
    for i in mine: print(f"  BLOCKED: #{i['number']} {i['title']}")
```

Then sync to latest remote (hard reset — discards any local uncommitted changes):
```bash
git fetch origin variant && git reset --hard FETCH_HEAD
```

Read the issue completely before touching any code.

---

## STEP 1 — When you find a problem during work

Two cases. Pick the right one:

**Case A — Sub-task or edge case of the issue you are currently working on:**
Comment on the current issue first, then decide whether to fix inline or open a new issue.

```python
import json, urllib.request, subprocess

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'", shell=True
).decode().strip()

ISSUE_NUMBER = N  # replace with current issue number

data = json.dumps({
    "body": "**Found during implementation:**\n\n[describe what you found]\n\n**Decision:** [fixing inline / opening new issue #N / blocked until X]"
}).encode()
req = urllib.request.Request(
    f"https://api.github.com/repos/xiNeRoar/lolproject/issues/{ISSUE_NUMBER}/comments",
    data=data,
    headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as r:
    print(f"Commented on #{ISSUE_NUMBER}")
```

**Case B — Independent problem in a different area:**
Open a new issue before fixing it.

```python
import json, urllib.request, subprocess

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'", shell=True
).decode().strip()

data = json.dumps({
    "title": "[Claude] One-line description",
    "labels": ["claude", "backend"],   # add "bug" if applicable
    "milestone": 2,                    # 1=Bot MVP 2=Web V1 3=VOD 4=Polish
    "body": "**Problem:** ...\n\n**What to do:** ...\n\n**Acceptance criteria:**\n- [ ] ...\n\nRelated to #N"
}).encode()
req = urllib.request.Request(
    "https://api.github.com/repos/xiNeRoar/lolproject/issues", data=data,
    headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as r:
    d = json.load(r); print(f"Opened #{d['number']}: {d['title']}")
```

Never fix silently without a record.

---

## STEP 2 — Commit, push, then close the issue via API

```bash
git add -A
git commit -m "short description

closes #N"
git push origin variant
```

**Then close via API — `closes #N` in commit message does NOT auto-close on non-default branches:**

```python
import json, urllib.request, subprocess

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'", shell=True
).decode().strip()

for n in [N]:  # replace with issue number(s)
    data = json.dumps({"state": "closed"}).encode()
    req = urllib.request.Request(
        f"https://api.github.com/repos/xiNeRoar/lolproject/issues/{n}",
        data=data, method="PATCH",
        headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        d = json.load(r); print(f"Closed #{d['number']}: {d['title']}")
```

---

## STEP 3 — Update the relevant doc in the same commit

| What changed | Update this file |
|---|---|
| Schema column or table added/changed | `docs/SCHEMA_CONTRACT.md` |
| Bot command added, changed, or clarified | `docs/BOT_SPEC.md` |
| New or changed API endpoint | `lib/api-spec/openapi.yaml` → run codegen |
| New environment variable required | `docs/DEPLOYMENT.md` |
| User journey step count improved | `docs/USER_JOURNEYS.md` |
| Architecture principle or constant changed | `CLAUDE.md` itself |

**CLAUDE.md is a living document.** Update it in the same commit when you learn something that changes how future sessions should work.

---

## STEP 4 — Check docs/REQUESTS.md each session

If Replit left a backend request: open a GitHub Issue for it, do the work, clear the entry from REQUESTS.md. All in one commit.

---

## Absolute Principles

1. **Schema → OpenAPI → codegen → route → page.** Never skip. Never write frontend fetch() by hand.
2. **Scrim (.rofl) does NOT count ELO.** ELO only for Tournament Code + Event matches. Scrim records W/L only.
3. **Teams own ELO. Players do not.** Player career = resume model (teams + per-team W/L + KDA).
4. **RSO = launch requirement.** Zero impersonation tolerance. /connect sends RSO link. /link-riot deleted.
5. **Bot is the match data producer.** `.rofl` parse via bot `/submit`. Website = identity (RSO) + management + display.
6. **3-layer privacy:** L1 scrim = login+participant. L2 RSO opt-in = public profile. L3 tournament = public by design.
7. **Read actual source files before answering.** Never guess schema or route signatures.
8. **No SSH. Portainer only.**

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
teams (teamElo, wins, losses, isActive, captainPlayerId nullable, lastMatchAt, defaultMatchVisibility)
  └── team_members (playerId, role, status: active/inactive/pending, lastActiveAt)
matches (teamAId, teamBId, matchType: scrim/ranked_tournament/event, visibleAfter, resultSource, roflFilePath, tournamentCode)
  └── match_players (10 rows: PUUID, champion, KDA, CS, items, win)
players (discordId, riotId, puuid, rsoOptIn, profileVisibility: default private)
elo_history · seasons · events · notifications · admin_actions · player_bans · bot_heartbeats · auth_sessions
```

---

## Auth

**Admin:** `req.session.adminId` (iron-session)
**Player identity:** RSO OAuth → PUUID (verified, launch requirement)
**Player login (website):** Discord OAuth → `discordId` → then RSO → `puuid` (two-step)
**Player login (no Discord):** RSO OAuth directly → `puuid`
**Bot /connect:** generates token → URL → website RSO flow → links discordId + puuid

---

## Visibility Rules

```
Scrim match (resultSource=rofl_parse):
  Public: Team A vs Team B + score only
  Login + participant: full 10-player stats
  Captain /visibility public: spectator VOD + match detail public

Tournament/Event match (matchType=ranked_tournament/event):
  Default public: full stats + ELO + VOD
  Captain /visibility private: override to restricted

Player profile:
  Default: private (profileVisibility="private", rsoOptIn=false)
  After RSO opt-in: player controls (public/private/participants-only)
```

VOD: follows match visibility. POV: requires individual player RSO opt-in consent.

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
ELO: only for matchType=ranked_tournament/event. Scrim = W/L record only.
gameDuration: milliseconds
MAX_ROSTER_SIZE: 15 (5 starters + 10 subs, enforced in /submit auto-add)
INACTIVITY_THRESHOLD: 5 (consecutive match absences before auto-inactive)
WIN_STREAK_BADGE: 5 (consecutive wins for badge)
SUBMIT_COOLDOWN_MS: 120000 (2 minutes between submissions per team)
MAX_ACTIVE_TEAMS: 3 (concurrent active teams per captain, enforced in /register-team)
TEAM_INACTIVITY_DAYS: 30 (no match in 30 days → isActive=false, daily check in seasonBroadcaster)
Bot commands: /register-team, /submit, /stats, /roster, /connect, /visibility, /transfer-captain, /leave, /remove, /register-event, /claim-match
Deleted commands: /add (→ .rofl auto-discovery), /link-riot (→ RSO /connect)
```

## Docker Deploy

```
docker-compose.bot.yml — all-in-one stack (PostgreSQL 16 + Bot)
  Portainer: Web editor paste, NOT Repository (ARM64 BuildKit broken)
  Only env var: DISCORD_BOT_TOKEN
  Bot auto-clones variant branch, pnpm install, drizzle-kit push, tsx start
  To update: Restart container (auto git fetch + reset on every start)
DISCORD_CLIENT_ID: 1486274314482356225
```
