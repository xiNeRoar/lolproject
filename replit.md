# VCLoL — Replit Session Reference

## Your Role

Frontend + Design ONLY. You own `artifacts/vclol/src/` and `replit.md`.
Never edit: schema, OpenAPI, backend routes, `CLAUDE.md`, `docs/` (except `docs/REQUESTS.md`).

**Issues:** https://github.com/xiNeRoar/lolproject/issues
**GitHub token:** read from git remote URL via `git remote get-url origin | grep -o 'ghp_[^@]*'`

---

## Mandatory Behaviors — Follow Every Session Without Being Told

### 1. Before touching any code

```bash
git fetch origin variant
git checkout FETCH_HEAD -- .
pnpm install
```

Read the assigned issue(s) completely. Read replit.md completely. Check `docs/USER_JOURNEYS.md` for the journey your issue serves and its step-count constraint.

### 2. If you discover a frontend problem with no GitHub Issue

Open one BEFORE fixing it:

```python
import json, urllib.request

TOKEN = # git remote get-url origin | grep -o 'ghp_[^@]*'
REPO = "xiNeRoar/lolproject"

data = json.dumps({
    "title": "[Replit] Short description",
    "labels": ["replit", "frontend"],   # + "bug" if applicable
    "milestone": MILESTONE_NUMBER,       # 2=Web V1 4=Polish
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

### 3. If you need a backend change

Do NOT edit backend files. Write to `docs/REQUESTS.md`:

```markdown
## Request: [brief title]
**Needed for:** Issue #N
**Endpoint:** METHOD /api/path
**Why:** what the frontend needs and why
**Response shape:** { field: type }
```

Then open a GitHub Issue for it (same format as above, labels: `claude, backend`).

### 4. Commit format — always

```bash
git add -A
git commit -m "brief description

closes #N"
git push origin variant
```

### 5. After completing an issue — check USER_JOURNEYS.md

Verify the journey your issue serves now meets its step-count constraint.
If you improved a step count, update `docs/USER_JOURNEYS.md` to reflect the new count.

### 6. Design validation before committing

Every component must pass:
- [ ] Follows Design System (DS-1 through DS-9 below)
- [ ] Has loading state (animate-pulse skeletons, never "Loading...")
- [ ] Has empty state (dashed border + icon + description)
- [ ] Mobile-responsive (test at 375px width)
- [ ] Uses `useAuth()` hook, never raw localStorage

---

## Stack

React 19 + Vite + Wouter + Tailwind CSS 4 + shadcn/ui + Recharts + Framer Motion
Fonts: Outfit (`font-display`) + Inter (body)

**API:** `@workspace/api-client-react` — generated hooks only.
Exception: endpoints not in OpenAPI may use `fetch(\`${API_BASE}/api/...\`)`.

---

## Auth

Always use `useAuth()` from `src/hooks/use-auth.ts`.
Returns: `{ playerId, isLoggedIn, riotId }`
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

Inline:    px-6 py-8 text-center text-muted-foreground text-sm (no icon)
```

### DS-5: Loading States
```
List:   5× h-16 bg-card rounded-xl animate-pulse (never "Loading...")
Detail: h-40 + h-48 bg-card rounded-xl animate-pulse
```

### DS-6: Text Colors
```
text-primary          — accent, links, interactive
text-yellow-400       — gold, peak ELO, captain badge
text-green-400        — wins, positive delta
text-red-400          — losses, negative delta
text-muted-foreground — secondary text
NO -500 variants. Ever.
```

### DS-7: Icon Sizing
```
CardTitle: w-4 h-4 text-primary (required)
h2 prose:  w-5 h-5 text-primary
h1 titles: NO icons
```

### DS-8: Mutations
Always use `toast` from `sonner` for success/error. Never silent mutations.

### DS-9: Admin Tables
```
Container: bg-card border border-border/50 rounded-lg overflow-x-auto
thead:     text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50
rows:      border-b border-border/20 hover:bg-muted/20
```

---

## Utilities

`src/lib/lol-utils.ts`: `eloBadgeColor(elo)` · `rankLabel(elo)` · `rankIcon(pos)` · `champPortraitUrl(name)` · `CHAMP_IDS` · `BADGE_META`

---

## Routing

New routes go in `App.tsx`. Current routes include:
`/` `/about` `/register` `/login` `/dashboard`
`/teams` `/teams/:id` `/teams/:id/manage`
`/players` `/players/:riotId`
`/matches/:id` `/events` `/events/:slug`
`/vods` `/vods/:id` `/contact` `/dev-login`
`/admin` (and all /admin/* routes)

---

## Issue Priority Order (when no specific issue assigned)

Work top-to-bottom. Do not start Web V1 issues until Bot MVP Claude issues are closed.

```
Bot MVP (Replit): #7
Web V1 (Replit):  #16 #17 (parallel) → #18 → #15 (needs #10+#14 from Claude)
Polish (Replit):  #22 (needs #20) · #23 (needs #21)
```

---

## Constants

```
API_BASE = import.meta.env.VITE_API_URL || ""
gameDuration: milliseconds → MM:SS display
visibleAfter null = 7-day default from createdAt
```
