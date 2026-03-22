# VCLoL — Replit Session Reference

## Your Role

Frontend + Design ONLY. You own `artifacts/vclol/src/` and `replit.md`.
Never edit: schema, OpenAPI, backend routes, `CLAUDE.md`, `docs/` (except `docs/REQUESTS.md`).

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
mine = [i for i in open_issues if "replit" in [l['name'] for l in i['labels']]]
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
    print("No unblocked Replit issues.")
    for i in mine: print(f"  BLOCKED: #{i['number']} {i['title']}")
```

Then sync to latest remote (hard reset — discards any local uncommitted changes):
```bash
git fetch origin variant && git reset --hard FETCH_HEAD && pnpm install
```

Read the issue. Check `docs/USER_JOURNEYS.md` for the journey it serves and its step-count constraint. Then start.

---

## STEP 1 — When you find a problem during work

Two cases. Pick the right one:

**Case A — Sub-task or edge case of the issue you are currently working on:**
Comment on the current issue first.

```python
import json, urllib.request, subprocess

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'", shell=True
).decode().strip()

ISSUE_NUMBER = N  # replace with current issue number

data = json.dumps({
    "body": "**Found during implementation:**\n\n[describe]\n\n**Decision:** [fixing inline / opening new issue #N / blocked]"
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
    "title": "[Replit] One-line description",
    "labels": ["replit", "frontend"],  # add "bug" if applicable
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

## STEP 2 — When you need a backend change

Write to `docs/REQUESTS.md` AND open a GitHub Issue (labels: `claude, backend`):

```markdown
## Request: [title]
**Needed for:** Issue #N
**Endpoint:** METHOD /api/path
**Why:** what the frontend needs
**Response shape:** { field: type }
```

Do NOT edit backend files. Claude picks this up next session.

---

## STEP 3 — Commit, push, then close the issue via API

```bash
git add -A
git commit -m "short description

closes #N"
git push origin variant
```

**Then close via API — `closes #N` does NOT auto-close on variant branch:**

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

## STEP 4 — Update docs and validate design

**Update `docs/USER_JOURNEYS.md`** if the journey step count improved.

**replit.md is a living document.** Update it in the same commit when you learn something about the design system or discover a pattern that should be standardized.

**Design validation before every commit:**
- [ ] Follows DS-1 through DS-9 below
- [ ] Loading state: animate-pulse skeletons (never "Loading...")
- [ ] Empty state: dashed border + icon + description
- [ ] Mobile-responsive at 375px
- [ ] Uses `useAuth()`, never raw localStorage
- [ ] Mutations use `toast` from sonner, never silent

---

## Stack

React 19 + Vite + Wouter + Tailwind CSS 4 + shadcn/ui + Recharts + Framer Motion
Fonts: Outfit (`font-display`) + Inter (body)
API: `@workspace/api-client-react` generated hooks only.
Exception: endpoints not in OpenAPI may use `fetch(\`${API_BASE}/api/...\`)`.

---

## Auth

`useAuth()` from `src/hooks/use-auth.ts` → `{ playerId, isLoggedIn, riotId }`
Captain check: `player.teams.some(t => t.teamId === id && t.isCaptain)`

---

## Design System

### DS-1: Page Titles (h1)
```
Listing:   text-4xl font-display font-bold mb-2        — NO icons
Marketing: text-4xl md:text-5xl font-display font-bold — NO icons
Detail:    text-2xl to text-3xl font-display font-bold — NO icons
```

### DS-2: CardTitle
```
className="text-base font-display flex items-center gap-2"
Icon: w-4 h-4 text-primary — REQUIRED in every CardTitle
```

### DS-3: Cards
```
Standard:  bg-card/40 border-border/40
Elevated:  bg-card/60 border-border/40
Subtle:    bg-card/30 border-border/40
Admin:     bg-card border border-border/50
```

### DS-4: Empty States
```
Full page: border border-dashed border-border rounded-lg py-20 text-center
           Icon: w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50
           Title: text-xl font-medium mb-2
           Body: text-muted-foreground text-sm

Inline:    px-6 py-8 text-center text-muted-foreground text-sm
```

### DS-5: Loading States
```
List:   5× h-16 bg-card rounded-xl animate-pulse
Detail: h-40 + h-48 bg-card rounded-xl animate-pulse
NEVER text "Loading..."
```

### DS-6: Text Colors
```
text-primary          — accent, links, interactive
text-yellow-400       — gold, peak ELO, captain badge
text-green-400        — wins, positive delta
text-red-400          — losses, negative delta
text-muted-foreground — secondary
NO -500 variants
```

### DS-7: Icon Sizing
```
CardTitle: w-4 h-4 text-primary (required)
h2 prose:  w-5 h-5 text-primary
h1 titles: NO icons
```

### DS-8: Mutations
`toast` from `sonner` for success/error. Never silent.

### DS-9: Admin Tables
```
Container: bg-card border border-border/50 rounded-lg overflow-x-auto
thead:     text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50
rows:      border-b border-border/20 hover:bg-muted/20
```

---

## Utilities

`src/lib/lol-utils.ts`: `eloBadgeColor` · `rankLabel` · `rankIcon` · `champPortraitUrl` · `CHAMP_IDS` · `BADGE_META`

---

## Constants

```
API_BASE = import.meta.env.VITE_API_URL || ""
gameDuration: milliseconds → MM:SS
visibleAfter null = 7-day default
```

---

## Completed Issues

- **#23** Global search UI — nav search bar (desktop visible, mobile icon expand), debounced 300ms, grouped dropdown
- **#22** Players page — enriched data (team name, total games, win rate)
- **#18 R1** MatchDetail "Unregistered Team" badge — yellow badge when `teamAId` or `teamBId` is null
- **#18 R2** MatchDetail "Claim this match" CTA — captain can claim unregistered side via `useClaimTeamForMatch`
- **#18 R3** PlayerProfile "Is this you?" banner — ~~shows when not logged in~~ REMOVED in #101
- **#18 R4** PlayerDashboard riotId pending alert — yellow warning when puuid null
- **#18 R5** ManagePlayers + ManageTeams ban button — `useCreateBan`/`useLiftBan`/`useListBans`, ban dialog, banned badge, lift ban
- **#18 R6** ManageTeams member management — expandable members panel, `useListTeamMembers`/`useAddTeamMember`/`useUpdateTeamMember`/`useRemoveTeamMember`
- **#18 R7** Admin Dashboard Bot Status card — `useGetBotStatus` → Online/Offline + last seen
- **#18 R8** Admin Dashboard Render Queue card — `useGetReplayQueueStats` → pending/processing/failed
- **#18 R9** Footer "What is VCLoL?" — link to /about in footer
- **#18 R10** Admin Dashboard admin actions card — `useListAdminActions` → last 10 actions with labels/timestamps
- **#16** Dashboard overhaul — Recent Matches section (last 5, W/L badges), Captain quick-links, actionable notifications
- **#15** CaptainHub — visibility, roster, settings, transfer captain
- **#17** TeamProfile VOD section — `useListVods({ teamId })`, YouTube embed, match links
- **#37** Register bot invite — `VITE_BOT_INVITE_URL` env var: live link if set, disabled button if unset
- **#39** NA-wide copy — removed Vancouver/Lower Mainland from Home hero, phase banner, Discord CTA, footer
- **#40** MatchDetail explainer — "What is VCLoL?" dismissible banner for unauthenticated users
- **#41** Home stats always show — removed `>=10` matches threshold from stats bar
- **#42** Notification link fix — `match_result` links to team profile (fallback until backend entityId)
- **#43** Players sort/filter — sort by Name/Games/WinRate, min games filter, role filter buttons
- **#45** Ladder empty state — /register CTA in empty leaderboard
- **#46** 404 redesign — PublicLayout wrapper, Go Home CTA, Ladder/Players/VODs quick links
- **#47** ELO chart dates — TeamProfile X axis uses `createdAt` dates, not match numbers
- **#48** CaptainHub access control — login prompt (not logged in) + captain-only message (wrong user) instead of silent redirect
- **#49** Nav label — "Ladder" → "Ranking" (per owner preference)
- **#50** /matches page — new page listing all matches with scores, dates, winner highlight, empty state CTA
- **#51** MatchDetail score prominence — score is 4xl/5xl center element flanked by team names
- **#52** Champion icons — `champPortraitUrl()` + name in both team player stats tables
- **#53** About removed from nav — footer-only via "What is VCLoL?"
- **#58** Nav labels — "Ladder"→"Ranking", "VODs"→"Watch" (per owner preference)
- **#89** Register page `<a>` → `<Link>` — no full page reload on "Log in here" navigation
- **#91** VodDetail ExternalLink → PlayCircle icon swap
- **#92** Events badge sentence case — `.charAt(0).toUpperCase() + .slice(1)` replaces `toUpperCase()`
- **#93** Dashboard notification icon dedup — match_result → ⚔️ (was duplicate 🔔)
- **#95** VOD page team filter dropdown — `teamIdFilter` state + `All Teams` select via `useGetLadder`
- **#96** "View All →" links — TeamProfile → `/matches?teamId=X`, PlayerProfile → `/matches`
- **#97** CaptainHub raw checkbox → Shadcn `<Checkbox>` component
- **#99** Full -500 → -400 color migration across 6+ files (CaptainHub, TeamProfile, MatchDetail, PlayerProfile, DevLogin, MatchList, lol-utils)
- **#100** Teams page mobile W/L visible — removed `hidden` from W/L column, only Win Rate hidden on mobile
- **#101** "Is this you?" banner removed from PlayerProfile (supersedes #18 R3)
- **#102** Register page "Already registered? Log in here →" link added at bottom
- **#103** MatchDetail claim explanation text — "Captains: link your team to this side for ELO tracking"
- **#104** GlobalSearch keyboard nav — ArrowUp/Down/Enter, highlightedIndex, scrollIntoView, ARIA combobox/listbox/option
- **#105** PlayerProfile VOD row ExternalLink → PlayCircle icon
- **#107** Dashboard quick stats grid — Record (W/L), Win Rate %, Avg KDA below player card

## Issues Closed via API

#15, #16, #17, #18, #22, #23, #32, #34, #37, #39, #40, #41, #42, #43, #45, #46, #47, #48, #49, #50, #51, #52, #53, #58, #89, #90, #91, #92, #93, #95, #96, #97, #99, #100, #101, #102, #103, #104, #105, #107. #7 was already closed.

## Open Backend Issues (Audit R2 — filed by Replit)

Opened after full system audit against PRD v3. All require backend/bot changes. Labels: `claude, backend, audit-r2`. Milestone: 4 (Polish).

- **#130** Notification delivery: `notifyPlayer()` never called — Email/Discord DM never fires
- **#131** `climber` badge: no trigger logic defined or implemented (needs owner design decision)
- **#132** Player profile privacy toggle missing — PRD §7 (backend first, then Replit does frontend follow-up)
- **#133** Auto-inactive roster members after N consecutive match absences — PRD §8 (blocked by #130 for notification)

Backend requests documented in `docs/REQUESTS.md`.

## Notification System Status

- **Web notification (DB insert):** ✅ Works — Discord Bot `/submit` writes to `notifications` table
- **Email (Resend):** ❌ `notifyPlayer()` never called — dead code
- **Discord DM:** ❌ `notifyPlayer()` never called — dead code
- **Dashboard display:** ✅ Works — `PlayerDashboard.tsx` shows notifications with icons, mark-read, time ago
- **Nav indicator:** ✅ Works — UserDropdown shows red dot on avatar + "Notifications (N)" menu item when unread > 0
- **Player pref toggle:** ✅ Works — Dashboard has web/email/discord/both selector
- **Dev fallback:** Dev-only mock data when API returns 401 (DevLogin has no session)

## Badge System Status

- `first_blood` ✅ Auto-awarded after first match (`badges.ts:63`)
- `veteran` ✅ Auto-awarded at 20+ matches (`badges.ts:68`)
- `win_streak` ✅ Auto-awarded on 3 consecutive wins (`badges.ts:75`)
- `season_champion` ✅ Auto-awarded on season completion (`badges.ts:108`)
- `climber` ❌ No trigger logic — see #131

## API Status

All endpoints working. #32 DB schema drift fixed (manual ALTER TABLE for missing columns).
Working: `/api/players`, `/api/teams`, `/api/teams/:id`, `/api/matches`, `/api/matches/:id`, `/api/search?q=`, `/api/vods`, `/api/bot-status`, `/api/replay-queue-stats`, `/api/bans`, `/api/admin/actions`, `/api/notifications`, `/api/notifications/:id/read`
