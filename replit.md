# VCLoL — Replit Session Reference

## Your Role

Frontend + Design ONLY. You own `artifacts/vclol/src/` and `replit.md`.
Never edit: schema, OpenAPI, backend routes, `CLAUDE.md`, `docs/` (except `docs/REQUESTS.md`).

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
mine = [i for i in open_issues if "replit" in [l['name'] for l in i['labels']]]
mine.sort(key=lambda i: ((i.get('milestone') or {}).get('number', 99), i['number']))

def blocked(issue):
    refs = re.findall(r'[Bb]locked by[:\s#]+(\d+)', issue.get('body', '') or '')
    return any(int(n) not in closed for n in refs)

next_issue = next((i for i in mine if not blocked(i)), None)
if next_issue:
    ms = (next_issue.get('milestone') or {}).get('title', 'none')
    print(f"NEXT: #{next_issue['number']} [{ms}] {next_issue['title']}")
else:
    print("No unblocked Replit issues.")
    for i in mine: print(f"  BLOCKED: #{i['number']} {i['title']}")
```

Then: `git fetch origin variant && git checkout FETCH_HEAD -- . && pnpm install`

Read the issue. Check `docs/USER_JOURNEYS.md` for the journey it serves and its step-count constraint. Then start.

---

## MANDATORY: When you find ANY frontend problem, gap, or improvement

**Do not fix silently. Open a GitHub Issue first, every time.**

```python
import json, urllib.request, subprocess

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'", shell=True
).decode().strip()

data = json.dumps({
    "title": "[Replit] One-line description",
    "labels": ["replit", "frontend"],  # add "bug" if it's a bug
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

This applies to: UI bugs, UX gaps, broken journeys, missing empty states, missing loading states — anything. If it's worth fixing, it needs an issue first.

---

## MANDATORY: When you need a backend change

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

## MANDATORY: Commit format — every time

```bash
git add -A
git commit -m "short description

closes #N"
git push origin variant
```

---

## MANDATORY: After every issue — update docs and validate design

**Update `docs/USER_JOURNEYS.md`** if the journey step count improved.

**replit.md is a living document.** If you learn something about the design system, discover a pattern that should be standardized, or find a rule that's missing — update replit.md in the same commit. You own this file.

**Design validation before every commit:**
- [ ] Follows DS-1 through DS-9 below
- [ ] Loading state: animate-pulse skeletons (never text "Loading...")
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
