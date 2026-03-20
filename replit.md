# VCLoL — Replit Session Reference

Read this file before every session. Each session is scoped to specific GitHub Issue numbers — read the issue, do the work, commit with `closes #N`.

---

## Your Role

Frontend + Design ONLY. You own page files, components, hooks, styling, App.tsx.
Never edit: schema, OpenAPI spec, backend routes, CLAUDE.md, docs/ (except this file and REQUESTS.md).
Need a backend change? Write to `docs/REQUESTS.md`.

---

## Stack

React 19 + Vite + Wouter + Tailwind CSS 4 + shadcn/ui + Recharts + Framer Motion
Fonts: Outfit (headings, `font-display`) + Inter (body)

**API client:** `@workspace/api-client-react` — generated hooks only. No manual `fetch()`.
Exception: endpoints not in OpenAPI (POV request, replay download) may use `fetch(\`${API_BASE}/api/...\`)`.

---

## File Ownership

**You own:**
`artifacts/vclol/src/pages/**` · `artifacts/vclol/src/components/**` (except `ui/`) · `artifacts/vclol/src/lib/` · `artifacts/vclol/src/hooks/` · `artifacts/vclol/src/App.tsx` · `artifacts/vclol/src/index.css` · `replit.md`

**Never edit:**
`lib/db/src/schema/*` · `lib/api-spec/openapi.yaml` · `lib/api-client-react/src/generated/*` · `artifacts/api-server/**` · `artifacts/discord-bot/**` · `CLAUDE.md` · `docs/` (except REQUESTS.md)

---

## Auth

Always use `useAuth()` from `src/hooks/use-auth.ts`. Never call localStorage directly.
Returns: `{ playerId, isLoggedIn, riotId }`
Captain check: `player.teams.some(t => t.teamId === id && t.isCaptain)`

---

## Design System

### DS-1: Page Titles (h1)
```
Listing pages:   text-4xl font-display font-bold mb-2        — NO icons
Marketing pages: text-4xl md:text-5xl font-display font-bold — NO icons
Detail pages:    text-2xl to text-3xl font-display font-bold — NO icons
```

### DS-2: CardTitle (inside Cards)
```
className="text-base font-display flex items-center gap-2"
Icon: w-4 h-4 text-primary — ALWAYS required in CardTitle
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
           Description: text-muted-foreground text-sm

Inline (inside Card): px-6 py-8 text-center text-muted-foreground text-sm
```

### DS-5: Loading States
```
List page:   5× h-16 bg-card rounded-xl animate-pulse
Detail page: h-40 + h-48 bg-card rounded-xl animate-pulse
NEVER: text "Loading..."
```

### DS-6: Text Colors
```
text-primary          — accent, links, interactive
text-yellow-400       — gold, peak ELO, captain badge
text-green-400        — wins, positive delta
text-red-400          — losses, negative delta
text-muted-foreground — secondary/body text
NO -500 variants. Ever.
```

### DS-7: Icon Sizing
```
CardTitle icons:   w-4 h-4 text-primary
h2 section icons:  w-5 h-5 text-primary
Page h1 titles:    NO icons
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

## Key Utilities

`src/lib/lol-utils.ts`:
- `eloBadgeColor(elo)` — Tailwind class string
- `rankLabel(elo)` — "Gold" / "Silver" / "Bronze" / "Unranked"
- `rankIcon(position)` — "🥇" / "🥈" / "🥉" / null
- `champPortraitUrl(name)` — Data Dragon URL
- `CHAMP_IDS` — champion name → Data Dragon ID
- `BADGE_META` — badge type → { emoji, label }

---

## User Journey Rule

Before building any feature, check `docs/USER_JOURNEYS.md`:
- Which journey does this serve?
- What is the max allowed step count?
- Does this design meet it?

Every design decision should reduce steps, never add them.

---

## Current Routes

```
/ /about /register /login /dashboard
/teams /teams/:id /teams/:id/manage  ← NEW (Issue #15)
/players /players/:riotId
/matches/:id
/events /events/:slug
/vods /vods/:id
/contact /dev-login
/admin /admin/login /admin/players /admin/teams
/admin/seasons /admin/seasons/:id
/admin/events /admin/events/:id
/admin/matches /admin/vods /admin/ladder-settings
```

---

## Constants

```
API_BASE = import.meta.env.VITE_API_URL || ""
gameDuration: milliseconds → display MM:SS
visibleAfter null = 7-day default
Seed: Team Alpha id=8, Team Beta id=9
```

---

## Handoff Protocol

Claude → you: commit `[HANDOFF-REPLIT] closes #N`
You → Claude: commit `[HANDOFF-CLAUDE] closes #N`
