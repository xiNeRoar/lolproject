# VCLOL — Correction Prompt

---

## HOW TO EXECUTE

This prompt fixes known bugs and missing features. It is divided into 7 phases. Execute one phase at a time. Do not proceed until the current phase's verification checklist passes entirely.

**Rules:**
- Never skip a STOP checkpoint
- If token limit is approaching mid-phase: STOP, report status to user, do not silently skip
- Before editing any file, read it first
- All new code must match existing patterns (formatX helpers, requireAdmin, Drizzle only, no `any` types)
- Do NOT change anything not listed in this prompt

---

## PLATFORM CONTEXT

This is VCLoL — Vancouver Competitive LoL Project. pnpm monorepo.
- Frontend: `artifacts/vclol/`
- Backend: `artifacts/api-server/`
- Schema: `lib/db/src/schema/`
- OpenAPI spec: `lib/api-spec/openapi.yaml` — single source of truth
- Generated hooks: `lib/api-client-react/src/generated/` — NEVER edit manually, always regenerate via orval after spec changes

---

## PHASE 1 — Schema + OpenAPI + Codegen

### 1A. Extend `lib/db/src/schema/players.ts`

The `playersTable` already has `discordId`, `email`, `notificationPreference` columns. **Verify they exist.** If missing, add them:
```typescript
discordId: text("discord_id"),
email: text("email"),
notificationPreference: text("notification_preference").notNull().default("web"),
```

### 1B. Extend `lib/db/src/schema/eventRegistrations.ts`

Add these two columns to `eventRegistrationsTable`:
```typescript
// status tracks registration lifecycle: registered → confirmed → withdrawn
status: text("status").notNull().default("registered"),
// FK to players table — links registration to a player record
playerId: integer("player_id").references(() => playersTable.id, { onDelete: "set null" }),
```

Add `import { playersTable } from "./players";` at the top.

### 1C. Update `lib/api-spec/openapi.yaml` — Player schemas

In the `Player` schema, add these nullable fields:
```yaml
        email:
          type: string
          nullable: true
        notificationPreference:
          type: string
          nullable: true
        discordId:
          type: string
          nullable: true
```

In the `CreatePlayerRequest` schema, add:
```yaml
        email:
          type: string
          nullable: true
        notificationPreference:
          type: string
          nullable: true
```

In the `PlayerProfile` schema, add the same `email`, `notificationPreference`, `discordId` fields.

### 1D. Update `lib/api-spec/openapi.yaml` — EventRegistration schema

In the `EventRegistration` schema, add:
```yaml
        status:
          type: string
        playerId:
          type: integer
          nullable: true
```

Add `status` to the `required` list.

In the `CreateRegistrationRequest` schema, add:
```yaml
        playerId:
          type: integer
          nullable: true
        status:
          type: string
          nullable: true
```

### 1E. Run migration and codegen

1. Run Drizzle migration to apply schema changes
2. Run orval codegen to regenerate `lib/api-client-react/src/generated/`
3. Verify app still compiles

**PHASE 1 STOP:**
- [ ] `playersTable` has `email`, `notificationPreference`, `discordId`
- [ ] `eventRegistrationsTable` has `status` and `playerId`
- [ ] OpenAPI `Player` schema has `email`, `notificationPreference`, `discordId`
- [ ] OpenAPI `EventRegistration` schema has `status` and `playerId`
- [ ] Migration ran without errors
- [ ] Orval codegen ran without errors
- [ ] App compiles without TypeScript errors

Tell user: "Phase 1 complete."

---

## PHASE 2 — Backend Route Fixes

### 2A. `artifacts/api-server/src/routes/players.ts` — POST accepts email/notificationPreference

In the `POST /` handler, update the destructured body to include:
```typescript
const { riotId, discordUsername, currentElo, isActive, email, notificationPreference } = req.body as {
  riotId?: string;
  discordUsername?: string;
  currentElo?: number;
  isActive?: boolean;
  email?: string;
  notificationPreference?: string;
};
```

Update the `db.insert()` values to include:
```typescript
email: email || null,
notificationPreference: notificationPreference || "web",
```

### 2B. `artifacts/api-server/src/routes/players.ts` — PUT accepts email/notificationPreference

In the `PUT /:id/edit` handler, add to destructured body:
```typescript
email?: string;
notificationPreference?: string;
```

Add to the `updates` object:
```typescript
if (email !== undefined) updates.email = email || null;
if (notificationPreference !== undefined) updates.notificationPreference = notificationPreference;
```

### 2C. `artifacts/api-server/src/routes/players.ts` — formatPlayer returns new fields

Update `formatPlayer()` to include:
```typescript
email: p.email ?? null,
notificationPreference: p.notificationPreference,
discordId: p.discordId ?? null,
```

### 2D. `artifacts/api-server/src/routes/ladder.ts` — use DB settings not hardcoded constant

Replace the import of `LADDER_MIN_MATCHES` with a DB fetch:

```typescript
import { ladderSettingsTable } from "@workspace/db";

// Inside the route handler, replace the hardcoded filter:
const [ladderSettings] = await db.select().from(ladderSettingsTable).limit(1);
const minMatches = ladderSettings?.minMatchesForDisplay ?? 4;

// Replace: p.wins + p.losses >= LADDER_MIN_MATCHES
// With:    p.wins + p.losses >= minMatches
```

Remove the `LADDER_MIN_MATCHES` import from `../lib/elo`.

### 2E. `artifacts/api-server/src/routes/vods.ts` — GET / returns playerRiotId

In the `GET /` handler, the response currently has `playerRiotId: null` hardcoded. Fix this by joining players table:

Change the select query to also join players:
```typescript
let rows = await db
  .select({
    // ... all existing fields ...
    eventTitle: eventsTable.title,
    playerRiotId: playersTable.riotId,
  })
  .from(vodEntriesTable)
  .leftJoin(eventsTable, eq(vodEntriesTable.eventId, eventsTable.id))
  .leftJoin(playersTable, eq(vodEntriesTable.playerId, playersTable.id))
  .orderBy(vodEntriesTable.createdAt);
```

Update the response map to use `r.playerRiotId ?? null` instead of `null`.

**PHASE 2 STOP:**
- [ ] `POST /api/players` with `email` and `notificationPreference` fields saves correctly
- [ ] `PUT /api/players/:id/edit` with `notificationPreference` saves correctly
- [ ] `GET /api/players/:riotId` response includes `email` and `notificationPreference`
- [ ] `GET /api/ladder` uses `minMatchesForDisplay` from DB not hardcoded 4
- [ ] `GET /api/vods` returns correct `playerRiotId` (not always null)
- [ ] App compiles without errors

Tell user: "Phase 2 complete."

---

## PHASE 3 — Frontend Layout + UI Fixes

### 3A. `artifacts/vclol/src/App.tsx` — Add Sonner

`PlayerDashboard.tsx` uses `import { toast } from "sonner"` but `App.tsx` only has shadcn `<Toaster />`. Add Sonner:

```typescript
import { Toaster as Sonner } from "sonner";
```

Add `<Sonner />` inside the `App` return, alongside the existing `<Toaster />`.

### 3B. `artifacts/vclol/src/components/layout/PublicLayout.tsx` — Reactive auth state

The current code has `localStorage.getItem("vclol_player_id")` called directly in JSX, which is not reactive. Fix:

```typescript
import { useState, useEffect } from "react";

// Inside the component:
const [playerId, setPlayerId] = useState<string | null>(null);

useEffect(() => {
  setPlayerId(localStorage.getItem("vclol_player_id"));
}, []);
```

Replace all `localStorage.getItem("vclol_player_id")` in the JSX with `playerId`.

### 3C. `artifacts/vclol/src/components/layout/PublicLayout.tsx` — Update CTA buttons

Desktop header: Change the "Join Interest List" link to:
```tsx
<Link href="/register" className="text-sm font-medium px-4 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20">
  Register
</Link>
```

Mobile nav: Find the mobile "Join Interest List" button at the bottom of the mobile menu and change it to:
```tsx
<Link
  href="/register"
  onClick={() => setMobileMenuOpen(false)}
  className="block px-3 py-2 mt-4 rounded-md text-base font-medium bg-primary text-primary-foreground"
>
  Register
</Link>
```

### 3D. `artifacts/vclol/src/pages/public/Ladder.tsx` — Dynamic min matches text

Find the hardcoded text `<p className="text-xs text-muted-foreground mb-10">Requires at least 4 matches...</p>`

Replace with dynamic value from `settings` (already fetched via `useGetLadderSettings()`):
```tsx
<p className="text-xs text-muted-foreground mb-10">
  Requires at least {settings?.minMatchesForDisplay ?? 4} matches to appear on the ladder.
</p>
```

### 3E. `artifacts/vclol/src/pages/public/Ladder.tsx` — Add Matchmaking "Coming Soon" section

After the "How the Ladder Works" section, add:
```tsx
<div className="mt-6 border border-border/30 rounded-xl p-6 bg-card/20 opacity-60">
  <div className="flex items-center gap-3 mb-2">
    <h3 className="text-lg font-display font-semibold">Auto Matchmaking</h3>
    <Badge variant="outline" className="text-xs">Coming Soon</Badge>
  </div>
  <p className="text-sm text-muted-foreground">
    Automatic matchmaking queue — the system will pair you with opponents of similar ELO. 
    Available in a future update.
  </p>
  <Button disabled className="mt-4 opacity-50" variant="outline">
    Join Queue — Coming Soon
  </Button>
</div>
```

### 3F. `artifacts/vclol/src/pages/public/Events.tsx` — Update banner for new formats

Update `getEventBanner()` to recognise the new format values:
```typescript
function getEventBanner(format: string): string {
  const f = format.toLowerCase();
  if (f === "1v1" || f === "1v1 ladder") return `${DD}/cdn/img/champion/splash/Draven_0.jpg`;
  if (f.includes("house") || f.includes("5v5") || f.includes("team")) return `${DD}/cdn/img/champion/splash/Orianna_0.jpg`;
  if (f.includes("elimination") || f.includes("swiss") || f.includes("robin") || f.includes("knockout")) return `${DD}/cdn/img/champion/splash/Jinx_0.jpg`;
  return `${DD}/cdn/img/champion/splash/Caitlyn_0.jpg`;
}
```

**PHASE 3 STOP:**
- [ ] Sonner toasts work in PlayerDashboard (test by saving notification preference)
- [ ] Header Login/Dashboard link updates without page refresh after setting localStorage
- [ ] Desktop and mobile nav show "Register" not "Join Interest List"
- [ ] Ladder page min matches text is dynamic from API
- [ ] Ladder page has "Auto Matchmaking - Coming Soon" section
- [ ] Events page shows Jinx banner for elimination/swiss/robin formats
- [ ] App runs without errors

Tell user: "Phase 3 complete."

---

## PHASE 4 — EventDetail Fixes

### 4A. Remove old free-text registration form from EventDetail

File: `artifacts/vclol/src/pages/public/EventDetail.tsx`

Remove all of the following from this file:
- The `regSchema` zod object and `RegFormValues` type
- The `useCreateRegistration` import
- The `registerMutation` variable
- The `registered` state
- The `onSubmit` function
- The entire sidebar `<Card>` containing the registration form

Replace the entire sidebar card with:
```tsx
<div>
  <div className="sticky top-24">
    <Card className="border-primary/20 shadow-lg shadow-black/50">
      <CardContent className="p-6">
        <h3 className="text-xl font-display font-bold mb-2">Participate</h3>
        {!isOpen ? (
          <div className="bg-secondary/50 p-4 rounded text-center text-sm text-muted-foreground">
            Registration for this event is currently closed.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              To register for this event, you must be a registered VCLoL player.
            </p>
            <Link href="/register">
              <Button className="w-full">Register as Player →</Button>
            </Link>
            <p className="text-xs text-muted-foreground text-center">
              Already registered? Contact admin via Discord to be added to this event.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
</div>
```

Remove unused imports: `useCreateRegistration`, `useForm`, `zodResolver`, `z`, `Input`, `Textarea`, `useState` (if only used for registration).

### 4B. Fix EventDetail VODs to link internally

In EventDetail, find the Event VODs section:
```tsx
<a key={v.id} href={v.videoUrl} target="_blank" rel="noreferrer" className="block">
```

Replace with internal link:
```tsx
<Link key={v.id} href={`/vods/${v.id}`} className="block">
```

Remove the `target="_blank"` and `rel="noreferrer"`. Change `</a>` to `</Link>`.

### 4C. Add Participants section to EventDetail

After the "Overview" section and before "Match Results", add a participants section. Fetch registrations for this event using `useListRegistrations`:

```tsx
import { useListRegistrations } from "@workspace/api-client-react";

// Inside the component:
const { data: registrations } = useListRegistrations({ eventId: event.id });
```

Add section:
```tsx
<section>
  <h2 className="text-2xl font-display font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2">
    <Users className="w-5 h-5 text-primary" /> 
    Participants ({registrations?.length ?? 0})
  </h2>
  {!registrations?.length ? (
    <p className="text-muted-foreground text-sm">No registrations yet.</p>
  ) : (
    <div className="flex flex-wrap gap-2">
      {registrations.map((r) => (
        <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/40 text-sm">
          <span className="font-medium">{r.riotId}</span>
          {r.status && r.status !== "registered" && (
            <Badge variant="outline" className="text-[10px] px-1 py-0">{r.status}</Badge>
          )}
        </div>
      ))}
    </div>
  )}
</section>
```

Add `Users` to the lucide-react import.

**PHASE 4 STOP:**
- [ ] EventDetail sidebar shows "Register as Player" message, no free-text form
- [ ] EventDetail VODs link to /vods/:id not YouTube
- [ ] EventDetail shows Participants section with registration count
- [ ] No TypeScript errors from removed form code

Tell user: "Phase 4 complete."

---

## PHASE 5 — ManageRegistrations + event_registrations Improvements

### 5A. Update `artifacts/api-server/src/routes/registrations.ts`

Add confirm and withdraw endpoints:

```typescript
// PUT /:id/confirm — admin: confirm a registration
router.put("/:id/confirm", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db
    .update(eventRegistrationsTable)
    .set({ status: "confirmed" })
    .where(eq(eventRegistrationsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

// PUT /:id/withdraw — admin: mark a registration as withdrawn
router.put("/:id/withdraw", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [row] = await db
    .update(eventRegistrationsTable)
    .set({ status: "withdrawn" })
    .where(eq(eventRegistrationsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});
```

Also update the `GET /` response to include `status` field.

Add these two paths to `lib/api-spec/openapi.yaml` under `/registrations/{id}`:
- `PUT /registrations/{id}/confirm` — operationId: `confirmRegistration`
- `PUT /registrations/{id}/withdraw` — operationId: `withdrawRegistration`

Run orval codegen after updating spec.

### 5B. Update `artifacts/vclol/src/pages/admin/ManageRegistrations.tsx`

Add status column to the table, and Confirm/Withdraw action buttons per row:

Add `Status` column header after `Availability`.

In each row, add status badge:
```tsx
<td className="px-6 py-4">
  {item.status === "confirmed" ? (
    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Confirmed</Badge>
  ) : item.status === "withdrawn" ? (
    <Badge variant="outline" className="text-muted-foreground">Withdrawn</Badge>
  ) : (
    <Badge variant="secondary">Registered</Badge>
  )}
</td>
```

Add Confirm/Withdraw buttons in the Actions column alongside existing Delete:
```tsx
{item.status !== "confirmed" && (
  <Button variant="ghost" size="sm" className="text-green-400 text-xs"
    onClick={() => confirmMut.mutate({ id: item.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/registrations'] }) })}>
    Confirm
  </Button>
)}
{item.status !== "withdrawn" && (
  <Button variant="ghost" size="sm" className="text-yellow-400 text-xs"
    onClick={() => withdrawMut.mutate({ id: item.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/registrations'] }) })}>
    Withdraw
  </Button>
)}
```

Import `useConfirmRegistration` and `useWithdrawRegistration` from generated client.

### 5C. Add registration count to ManageEvents

In `artifacts/vclol/src/pages/admin/ManageEvents.tsx`, for each event card in the list, add a small registration count badge. Fetch all registrations with `useListRegistrations()` (no filter) and count per event:

```tsx
const { data: allRegistrations } = useListRegistrations();

// In each event card:
const regCount = allRegistrations?.filter(r => r.eventId === event.id).length ?? 0;
```

Display as small text next to the event title: `<span className="text-xs text-muted-foreground ml-2">{regCount} registered</span>`

**PHASE 5 STOP:**
- [ ] `PUT /api/registrations/:id/confirm` works
- [ ] `PUT /api/registrations/:id/withdraw` works
- [ ] ManageRegistrations shows Status column with badges
- [ ] ManageRegistrations has Confirm and Withdraw buttons per row
- [ ] ManageEvents shows registration count per event

Tell user: "Phase 5 complete."

---

## PHASE 6 — PlayerDashboard + PlayerProfile Fixes

### 6A. PlayerDashboard — Dynamic season progress

File: `artifacts/vclol/src/pages/public/PlayerDashboard.tsx`

Add `useGetLadderSettings` to imports from `@workspace/api-client-react`.

Inside `DashboardContent`:
```typescript
const { data: ladderSettings } = useGetLadderSettings();
const minMatchesRequired = ladderSettings?.minMatchesForDisplay ?? 4;
```

Replace hardcoded `/ 4 required for ladder` with `/ {minMatchesRequired} required for ladder`.

Update the Progress value: `Math.min((totalMatches / minMatchesRequired) * 100, 100)`.

### 6B. PlayerDashboard — Room Ready UI for upcoming matches

In the Upcoming Matches section, for each accepted challenge, replace the static "Room instructions will appear here" text with an actual submit form:

```tsx
{upcomingMatches.map((c) => {
  const isHost = c.challengerId === pid; // challenger opens the room
  return (
    <div key={c.id} className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-2">
      <p className="text-sm font-medium">
        vs {c.challengerId === pid ? c.challengedRiotId : c.challengerRiotId ?? "Opponent"}
      </p>
      {c.scheduledTime && (
        <p className="text-xs text-muted-foreground">{new Date(c.scheduledTime).toLocaleString()}</p>
      )}
      {isHost && !c.gameId && (
        <div className="space-y-1">
          <p className="text-xs text-yellow-400">You are the room host. Open a custom game, invite your opponent ({c.challengedRiotId}), then enter the Game ID below.</p>
          <GameIdSubmit challengeId={c.id} />
        </div>
      )}
      {!isHost && !c.gameId && (
        <p className="text-xs text-muted-foreground">Waiting for room host to open the game...</p>
      )}
      {c.gameId && (
        <p className="text-xs text-green-400">✓ Room ready — Game ID: {c.gameId}</p>
      )}
    </div>
  );
})}
```

Add a `GameIdSubmit` component at the top of the file:
```tsx
function GameIdSubmit({ challengeId }: { challengeId: number }) {
  const [gameId, setGameId] = useState("");
  const setGameReady = useSetChallengeGameReady();
  const queryClient = useQueryClient();

  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Enter Game ID"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
        className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs"
      />
      <Button
        size="sm"
        className="h-8 text-xs"
        disabled={!gameId || setGameReady.isPending}
        onClick={() => setGameReady.mutate(
          { id: challengeId, data: { gameId } },
          { onSuccess: () => { setGameId(""); queryClient.invalidateQueries({ queryKey: ["/api/challenges"] }); } }
        )}
      >
        Submit
      </Button>
    </div>
  );
}
```

Import `useSetChallengeGameReady`, `useQueryClient` at the top.

### 6C. PlayerProfile — Add Season Champion display

File: `artifacts/vclol/src/pages/public/PlayerProfile.tsx`

Add `useListSeasonChampions` to imports.

Inside the component:
```typescript
const { data: seasonChampions } = useListSeasonChampions({ query: { enabled: !!player?.id } });
const myChampionships = seasonChampions?.filter(c => c.playerId === player?.id) ?? [];
```

Add to the hero card, below the stats row, if myChampionships.length > 0:
```tsx
{myChampionships.length > 0 && (
  <div className="mt-4 pt-4 border-t border-border/40 flex flex-wrap gap-2">
    {myChampionships.map((c) => (
      <span key={c.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-medium">
        🏆 Season Champion
      </span>
    ))}
  </div>
)}
```

**PHASE 6 STOP:**
- [ ] PlayerDashboard season progress bar uses dynamic minMatchesForDisplay from API
- [ ] PlayerDashboard upcoming matches shows "Room Ready" form for host player
- [ ] PlayerDashboard upcoming matches shows "waiting for host" for challenged player
- [ ] PlayerProfile shows 🏆 Season Champion badge if applicable
- [ ] No TypeScript errors

Tell user: "Phase 6 complete."

---

## PHASE 7 — Admin Fixes

### 7A. ManageChallenges — Fix "Create Match" pre-fill

File: `artifacts/vclol/src/pages/admin/ManageChallenges.tsx`

The "Create Match →" button currently navigates with query params that ManageMatches ignores. Fix ManageMatches to read these params.

In `artifacts/vclol/src/pages/admin/ManageMatches.tsx`, add at the top of the component:

```typescript
import { useSearch } from "wouter";

// Inside component:
const search = useSearch();
const params = new URLSearchParams(search);
const prefilledPlayerAId = params.get("playerAId");
const prefilledPlayerBId = params.get("playerBId");
```

Update `openNew()` to use these values if present:
```typescript
const openNew = () => {
  reset({
    eventId: "",
    playerAId: prefilledPlayerAId || "",
    playerBId: prefilledPlayerBId || "",
    seasonId: "",
    isPlayoff: false,
    round: "",
    bracketSlot: "",
    isLosersBracket: false,
  });
  setEditingId(null);
  setIsOpen(true);
};
```

Also auto-open the dialog if both params are present — add a `useEffect`:
```typescript
useEffect(() => {
  if (prefilledPlayerAId && prefilledPlayerBId) {
    openNew();
  }
}, [prefilledPlayerAId, prefilledPlayerBId]);
```

### 7B. ManagePlayers — Add email and notificationPreference fields

File: `artifacts/vclol/src/pages/admin/ManagePlayers.tsx`

In the form inside the Dialog, add after the Discord Username input:
```tsx
<Input
  type="email"
  placeholder="Email (optional)"
  {...register("email")}
/>
<div>
  <label className="text-xs text-muted-foreground mb-1 block">Notification Preference</label>
  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" {...register("notificationPreference")}>
    <option value="web">Web only</option>
    <option value="email">Email</option>
    <option value="discord">Discord DM</option>
    <option value="both">Email + Discord</option>
  </select>
</div>
```

Update `onSubmit` payload to include:
```typescript
email: data.email || undefined,
notificationPreference: data.notificationPreference || "web",
```

Update `openEdit` reset to include:
```typescript
email: player.email || "",
notificationPreference: player.notificationPreference || "web",
```

**PHASE 7 STOP — FINAL VERIFICATION:**

Run every item:

**Layout:**
- [ ] Desktop header: "Register" button not "Join Interest List"
- [ ] Mobile nav: "Register" button not "Join Interest List"
- [ ] Header login/dashboard state updates reactively (no refresh needed)
- [ ] Sonner toasts show in PlayerDashboard

**EventDetail:**
- [ ] Sidebar shows "Register as Player" message, no free-text form
- [ ] VODs in EventDetail link to /vods/:id not YouTube
- [ ] Participants section shows with count

**ManageRegistrations:**
- [ ] Status column shows (registered/confirmed/withdrawn)
- [ ] Confirm and Withdraw buttons work
- [ ] ManageEvents shows registration count per event

**PlayerDashboard:**
- [ ] Season progress bar uses dynamic API value
- [ ] Upcoming matches has Room Ready form for host
- [ ] Notification preference saves correctly (Sonner toast confirms)

**PlayerProfile:**
- [ ] Season Champion 🏆 badge shows if applicable

**ManageChallenges:**
- [ ] "Create Match →" opens ManageMatches with player IDs pre-filled

**ManagePlayers:**
- [ ] Form has email and notification preference fields

**Backend:**
- [ ] GET /api/ladder uses minMatchesForDisplay from DB
- [ ] GET /api/vods returns playerRiotId (not null)
- [ ] GET /api/players/:riotId returns email and notificationPreference
- [ ] POST /api/players saves email and notificationPreference
- [ ] PUT /api/players/:id/edit saves notificationPreference

**Events page:**
- [ ] Elimination/Swiss/Robin format events show Jinx banner

**Ladder:**
- [ ] Min matches text is dynamic
- [ ] Auto Matchmaking "Coming Soon" section visible

**Code quality:**
- [ ] No `any` types introduced
- [ ] No hardcoded values that should come from API
- [ ] All new routes registered if any added

Tell user: **"All phases complete. Correction prompt fully applied."**
