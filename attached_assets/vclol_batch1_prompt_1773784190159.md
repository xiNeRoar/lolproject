# VCLOL — Batch 1 Prompt (Phase 1 Only)

---

## IMPORTANT: THIS IS BATCH 1 OF 2

Do ONLY what is in this document. Do NOT add any other features.
When Phase 1 checklist passes, stop and tell the user: "Batch 1 complete. Awaiting Batch 2 prompt."

---

## HOW TO EXECUTE

This is Phase 1 only. No schema changes. Low risk.

After completing all 6 changes, run the full Phase 1 verification checklist below before reporting completion.

**If token limit is approaching mid-phase: STOP at the current change, report to user what was completed and what remains. Do not silently skip.**

---

## PLATFORM PURPOSE (CONTEXT — READ FIRST)

This is **Vancouver Competitive LoL Project (VCLoL)** — a structured local competitive platform for Vancouver / Lower Mainland League of Legends players.

**Core value:** ELO Ladder (primary) + VOD Library (learning). Events are secondary tools, not destinations.

**Architecture:** pnpm monorepo. Frontend: `artifacts/vclol/`. Backend: `artifacts/api-server/`. Schema: `lib/db/`. Generated hooks: `lib/api-client-react/src/generated/` — never edit manually.

All new code must match existing patterns. Before editing any file, read it first.

---

## CHANGE 1 — Navigation

File: `artifacts/vclol/src/components/layout/PublicLayout.tsx`

Replace `navLinks` with:
```typescript
const navLinks = [
  { href: "/", label: "Home" },
  { href: "/ladder", label: "Ladder" },
  { href: "/vods", label: "VODs" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
];
```

Add Contact link inside the footer section (find the existing footer div):
```tsx
<Link href="/contact" className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
  Contact
</Link>
```

**Why:** Ladder is the platform's core — it belongs at position 2. Results is redundant (covered by Event Detail + Player Profile). Contact belongs in footer only.

---

## CHANGE 2 — Home VOD Preview

File: `artifacts/vclol/src/pages/public/Home.tsx`

In the "Recent VODs" section, find the outer `<motion.a href={vod.videoUrl} target="_blank">` wrapper. Replace it with `<Link href={`/vods/${vod.id}`}>` (wouter Link, no target="_blank"). Keep all inner card content and animation props unchanged.

Add `import { Link } from "wouter"` if not already imported.

**Why:** Clicking a VOD on Home should go to /vods/:id (timestamps + related VODs), not directly to YouTube. Going to YouTube bypasses the platform's core learning value.

---

## CHANGE 3 — Dashboard Stat Cards

File: `artifacts/vclol/src/pages/admin/Dashboard.tsx`

Add to the `statCards` array (the backend already returns these values):
```typescript
{ label: "Registered Players", value: stats?.players || 0, icon: UserCheck, color: "text-cyan-500" },
{ label: "Seasons", value: stats?.seasons || 0, icon: Trophy, color: "text-yellow-500" },
```

Add `UserCheck` and `Trophy` to the lucide-react import line at the top.

**Why:** Backend already returns players + seasons count. Admin needs visibility from dashboard.

---

## CHANGE 4 — Delete Results Page

1. Delete the file `artifacts/vclol/src/pages/public/Results.tsx`
2. In `artifacts/vclol/src/App.tsx`: remove the `import Results` line and remove `<Route path="/results" component={Results} />`

**Why:** A flat match list with no context has no value. Match data surfaces better in Event Detail (event context) and Player Profile (player context).

---

## CHANGE 5 — Match Detail Page

### Backend

File: `artifacts/api-server/src/routes/matches.ts`

Add a new `GET /:id` handler following the exact same pattern as existing handlers in this file. Use a `formatMatchDetail()` helper:

Returns single match joined with:
- `eventsTable` → `eventTitle`, `eventSlug`
- `playersTable` (playerA) → `playerARiotId`
- `playersTable` (playerB) → `playerBRiotId`

All fields nullable. Return 404 `{ error: "Not found" }` if match doesn't exist.

Add to OpenAPI spec `lib/api-spec/openapi.yaml`:
- Path: `GET /matches/{id}`
- operationId: `getMatch`
- Returns: `MatchDetail` schema (extend existing `Match` schema with `eventSlug`, `playerARiotId`, `playerBRiotId`)

Run orval codegen after updating the spec.

### Frontend

New file: `artifacts/vclol/src/pages/public/MatchDetail.tsx`

Route: `/matches/:id`

Use `useGetMatch(Number(id))` from generated client. Handle loading + error states.

Layout:
- Back link (← Back)
- Match title + format badge + isPlayoff badge (if true, show "Playoff" badge)
- Score displayed prominently in center
- Two-column player section:
  - Left: `sideAName` — if `playerARiotId` exists, render as `<Link href={/players/${encodeURIComponent(playerARiotId)}>`
  - Right: `sideBName` — same pattern for playerB
  - ELO before → after on each side: e.g. "1050 → 1066" with delta "+16" in green or "-12" in red
  - Winner side has a visual highlight (primary color)
- Below: Event link (if eventTitle exists → `<Link href={/events/${eventSlug}}>`)
- Below: Season name (if seasonId exists, show season name — can fetch from useListSeasons and find by id)
- Below: VOD button "Watch VOD →" → `/vods/:id` if match has a vodUrl that matches a vod record, otherwise link to vodUrl directly

Add to `App.tsx`:
```typescript
import MatchDetail from "@/pages/public/MatchDetail";
// ...
<Route path="/matches/:id" component={MatchDetail} />
```

### Make matches clickable

In `artifacts/vclol/src/pages/public/PlayerProfile.tsx`:
Wrap each match row in the Recent Matches list with `<Link href={`/matches/${match.id}`} className="block">`. Remove any existing `<div>` wrapper around the row content and replace with this Link.

In `artifacts/vclol/src/pages/public/EventDetail.tsx`:
Wrap each match row in the Match Results section with `<Link href={`/matches/${match.id}`} className="block">`. Same pattern.

---

## CHANGE 6 — VOD Detail Related VODs

File: `artifacts/vclol/src/pages/public/VodDetail.tsx`

In the "Related VODs" section, find the map over `vod.relatedVods`. Each card currently shows only the title. Below the title div, add:

```tsx
<div className="flex gap-2 mt-1 flex-wrap">
  {related.champion && (
    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
      {related.champion}{related.opponentChampion ? ` vs ${related.opponentChampion}` : ""}
    </span>
  )}
  {related.playerEloAtTime != null && (
    <span className="text-xs text-muted-foreground">ELO {related.playerEloAtTime}</span>
  )}
</div>
```

**Why:** The purpose of related VODs is to compare the same matchup across ELO levels. Without showing ELO + champion on each card, the comparison purpose is invisible.

---

## PHASE 1 VERIFICATION CHECKLIST

Verify every item before reporting completion:

- [ ] Nav shows: Home | Ladder | VODs | Events | About — nothing else
- [ ] Contact link exists in footer
- [ ] No "Results" link anywhere in the nav or page
- [ ] Clicking a VOD card on Home page goes to /vods/:id (not YouTube)
- [ ] Admin Dashboard shows "Registered Players" and "Seasons" stat cards
- [ ] Results.tsx file deleted, route removed from App.tsx
- [ ] /matches/:id route exists and page loads
- [ ] PlayerProfile Recent Matches rows are clickable links to /matches/:id
- [ ] EventDetail Match Results rows are clickable links to /matches/:id
- [ ] Match Detail page shows: title, score, both player names (with profile links), ELO before/after with delta
- [ ] VOD Detail Related VODs section shows champion + ELO on each card
- [ ] App runs without TypeScript errors
- [ ] No existing pages broken

When all pass: tell the user **"Batch 1 complete. All Phase 1 checks passed. Awaiting Batch 2 prompt."**
