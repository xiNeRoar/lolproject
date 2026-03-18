# VCLOL — Correction Round 2 (Replit)

---

## HOW TO EXECUTE

This prompt fixes frontend bugs found after deep code review. Execute one phase at a time. Do not proceed until the current phase's verification checklist passes entirely.

**Rules:**
- Never skip a STOP checkpoint
- Before editing any file, read it first
- Do NOT change anything not listed in this prompt
- If token limit approaching: STOP, report status to user

---

## PHASE 1 — OpenAPI Spec + Codegen Fixes

### 1A. Add `playerId` to `ListVodsParams` in `lib/api-spec/openapi.yaml`

Find the `/vods` GET path parameters list. Add:
```yaml
        - name: playerId
          in: query
          required: false
          schema:
            type: integer
```

### 1B. Add `seasonId` and `playerId` to `ListMatchesParams` in `lib/api-spec/openapi.yaml`

Find the `/matches` GET path parameters list. Add:
```yaml
        - name: seasonId
          in: query
          required: false
          schema:
            type: integer
        - name: playerId
          in: query
          required: false
          schema:
            type: integer
```

### 1C. Run orval codegen

Run orval codegen to regenerate `lib/api-client-react/src/generated/`. Verify `ListVodsParams` and `ListMatchesParams` now include the new fields.

**PHASE 1 STOP:**
- [ ] `ListVodsParams` in `api.schemas.ts` has `playerId?: number`
- [ ] `ListMatchesParams` in `api.schemas.ts` has `seasonId?: number` and `playerId?: number`
- [ ] App compiles without TypeScript errors

Tell user: "Phase 1 complete."

---

## PHASE 2 — Fix Reactive Auth State in Ladder + PlayerProfile

Both `Ladder.tsx` and `PlayerProfile.tsx` have these lines at **module scope** (outside the component function), which means they evaluate once on import and never update when the user logs in:

```typescript
// WRONG - module scope, never re-evaluates
const isLoggedIn = !!localStorage.getItem("vclol_player_id");
const myPlayerId = Number(localStorage.getItem("vclol_player_id"));
```

### 2A. Fix `artifacts/vclol/src/pages/public/Ladder.tsx`

Remove the two module-scope lines at the top of the file.

Inside the `Ladder` component function, add:
```typescript
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [myPlayerId, setMyPlayerId] = useState(0);

useEffect(() => {
  const id = localStorage.getItem("vclol_player_id");
  setIsLoggedIn(!!id);
  setMyPlayerId(id ? Number(id) : 0);
}, []);
```

Add `useEffect` to the React import: `import { useState, useEffect } from "react"`.

### 2B. Fix `artifacts/vclol/src/pages/public/PlayerProfile.tsx`

Remove the two module-scope lines at the top of the file.

Inside the `PlayerProfile` component function (before the early returns), add:
```typescript
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [myPlayerId, setMyPlayerId] = useState(0);

useEffect(() => {
  const id = localStorage.getItem("vclol_player_id");
  setIsLoggedIn(!!id);
  setMyPlayerId(id ? Number(id) : 0);
}, []);
```

`useState` and `useEffect` are already imported — verify and add if missing.

**PHASE 2 STOP:**
- [ ] `Ladder.tsx` has no module-scope localStorage calls
- [ ] `PlayerProfile.tsx` has no module-scope localStorage calls
- [ ] Both use `useState`/`useEffect` for auth state inside the component
- [ ] App compiles without errors

Tell user: "Phase 2 complete."

---

## PHASE 3 — Fix Home.tsx + Contact.tsx Stale Content

### 3A. Fix `artifacts/vclol/src/pages/public/Home.tsx`

Find the hero section CTA buttons. Change:
```tsx
<Link href="/interest">
  <Button size="lg" className="font-semibold w-full sm:w-auto">
    Join Interest List <ArrowRight className="ml-2 w-4 h-4" />
  </Button>
</Link>
```
To:
```tsx
<Link href="/register">
  <Button size="lg" className="font-semibold w-full sm:w-auto">
    Register Now <ArrowRight className="ml-2 w-4 h-4" />
  </Button>
</Link>
```

Also find the "Genesis Phase" section text that says "Currently gathering interest and running lightweight test events". Replace with:
```tsx
<p className="max-w-2xl mx-auto text-muted-foreground text-sm leading-relaxed">
  Building Vancouver's first structured competitive LoL ladder. Register to compete, 
  build your match record, and track your ELO over time.
</p>
```

### 3B. Fix `artifacts/vclol/src/pages/public/Contact.tsx`

Find the Discord card that says `"Links provided via Interest Form"`. Replace that `<p>` tag with:
```tsx
<p className="text-sm font-medium border border-border/50 bg-background px-4 py-2 rounded">
  Join via the Discord link on our Register page
</p>
```

### 3C. Update `artifacts/vclol/src/pages/public/About.tsx`

The "Current Focus: Gathering & Testing" section describes the platform as still in an early interest-gathering phase. This is now outdated — the platform has a live Register system, ELO Ladder, and VOD archive.

Replace the entire `<section className="bg-card border...">` block (the one with the left primary bar) with:
```tsx
<section className="bg-card border border-border/50 p-8 rounded-lg relative overflow-hidden">
  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
  <h2 className="text-2xl font-display font-semibold text-foreground mb-4 mt-0">Current Phase: Active Competition</h2>
  <p className="text-muted-foreground mb-4">
    The platform is live. Players can register, compete on the ELO Ladder, and build a verifiable match record over time.
  </p>
  <ul className="list-disc pl-5 text-muted-foreground space-y-2">
    <li><strong className="text-foreground">ELO Ladder:</strong> Persistent competitive ranking that tracks your progress across seasons.</li>
    <li><strong className="text-foreground">VOD Archive:</strong> First-person match recordings with timestamps, searchable by champion, matchup, and ELO range.</li>
    <li><strong className="text-foreground">Events & Brackets:</strong> Structured tournaments with bracket progression and recorded results.</li>
    <li><strong className="text-foreground">Challenge System:</strong> Challenge any ladder player directly through the website.</li>
  </ul>
</section>
```

**PHASE 3 STOP:**
- [ ] Home.tsx hero CTA says "Register Now" → `/register`
- [ ] Home.tsx Genesis Phase section has updated copy
- [ ] Contact.tsx Discord card no longer references "Interest Form"
- [ ] About.tsx "Current Focus" section reflects active platform state

Tell user: "Phase 3 complete."

---

## PHASE 4 — Fix PlayerDashboard W/L Logic + Season Champion

### 4A. Fix W/L logic in `artifacts/vclol/src/pages/public/PlayerDashboard.tsx`

Find the Recent Results section. The current broken logic:
```typescript
const won = m.winnerName === player.riotId || m.winnerName === m.sideAName;
```

Replace with the correct logic (same as PlayerProfile uses):
```typescript
const isA = m.playerAId === pid;
const won = m.winnerName === (isA ? m.sideAName : m.sideBName);
```

### 4B. Add Season Champion display to `artifacts/vclol/src/pages/public/PlayerProfile.tsx`

Add `useListSeasonChampions` to imports:
```typescript
import { useGetPlayer, useGetEloHistory, useGetPlayerBadges, useListSeasonChampions } from "@workspace/api-client-react";
```

Inside the component, after the `badges` fetch:
```typescript
const { data: seasonChampions } = useListSeasonChampions({ query: { enabled: !!player?.id } });
const myChampionships = seasonChampions?.filter(c => c.playerId === player?.id) ?? [];
```

Add to the hero card, after the stats row (wins/losses/win rate), before the closing `</CardContent>`:
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

**PHASE 4 STOP:**
- [ ] PlayerDashboard Recent Results W/L badge is now correct (uses `isA` logic)
- [ ] PlayerProfile imports `useListSeasonChampions`
- [ ] PlayerProfile shows 🏆 Season Champion section (visible when data exists)
- [ ] App compiles without TypeScript errors

Tell user: "Phase 4 complete."

---

## PHASE 5 — Fix Dashboard Room Ready UI

### 5A. Replace countdown timer with gameId submit form in `artifacts/vclol/src/pages/public/PlayerDashboard.tsx`

Add `useSetChallengeGameReady` to imports from `@workspace/api-client-react`.
Add `useQueryClient` to imports from `@tanstack/react-query`.

Add this component function before `DashboardContent`:
```tsx
function GameIdSubmit({ challengeId }: { challengeId: number }) {
  const [gameId, setGameId] = useState("");
  const setGameReady = useSetChallengeGameReady();
  const queryClient = useQueryClient();

  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text"
        placeholder="Enter Game ID"
        value={gameId}
        onChange={(e) => setGameId(e.target.value)}
        className="flex h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <Button
        size="sm"
        className="h-8 text-xs shrink-0"
        disabled={!gameId.trim() || setGameReady.isPending}
        onClick={() =>
          setGameReady.mutate(
            { id: challengeId, data: { gameId: gameId.trim() } },
            {
              onSuccess: () => {
                setGameId("");
                queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
              },
            }
          )
        }
      >
        {setGameReady.isPending ? "..." : "Submit"}
      </Button>
    </div>
  );
}
```

In `DashboardContent`, replace the entire Upcoming Matches `upcomingMatches.map(...)` block with:
```tsx
{upcomingMatches.map((c) => {
  const isHost = c.challengerId === pid;
  return (
    <div key={c.id} className="p-3 rounded-lg bg-background/50 border border-border/30 space-y-1">
      <p className="text-sm font-medium">
        vs {c.challengerId === pid ? c.challengedRiotId : c.challengerRiotId ?? "Opponent"}
      </p>
      {c.scheduledTime && (
        <p className="text-xs text-muted-foreground">{new Date(c.scheduledTime).toLocaleString()}</p>
      )}
      {c.gameId ? (
        <p className="text-xs text-green-400">✓ Room ready — Game ID: {c.gameId}</p>
      ) : isHost ? (
        <div>
          <p className="text-xs text-yellow-400">
            You are the room host. Open a custom game, invite your opponent by their Riot ID, then submit the Game ID below.
          </p>
          <GameIdSubmit challengeId={c.id} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Waiting for room host to open the game and submit Game ID...</p>
      )}
    </div>
  );
})}
```

**PHASE 5 STOP — FINAL VERIFICATION:**

- [ ] Codegen: `ListVodsParams` has `playerId`, `ListMatchesParams` has `seasonId` + `playerId`
- [ ] Ladder challenge button appears reactively after localStorage is set (no refresh needed)
- [ ] PlayerProfile challenge button appears reactively after localStorage is set
- [ ] Home.tsx hero CTA says "Register Now" → `/register`
- [ ] Contact.tsx no longer references Interest Form
- [ ] PlayerDashboard Recent Results shows correct W/L per player side
- [ ] PlayerProfile shows Season Champion 🏆 section
- [ ] PlayerDashboard Upcoming Matches: host sees gameId input form; non-host sees "waiting" message; submitted shows Game ID

Tell user: **"Correction Round 2 complete. All phases done."**
