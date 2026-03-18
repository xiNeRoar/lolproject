# VCLoL — Final Replit Frontend Tasks

This is the last Replit prompt before handoff to Claude Code.
Complete all phases in order. Do not proceed to next phase until verification passes.
Do not change anything not listed here.

---

## PHASE 0 — Place Reference Documents into Repo

Two files will be provided to you alongside this prompt: `CLAUDE.md` and `vclol_prd_final.md`.

**0A. Place `CLAUDE.md` in repo root:**
Create the file at exactly this path: `CLAUDE.md` (repo root, same level as `package.json`)
Content: paste the full contents of the provided `CLAUDE.md` file.

**0B. Place PRD in docs folder:**
Create directory `docs/` if it does not exist.
Create file at: `docs/PRD.md`
Content: paste the full contents of the provided `vclol_prd_final.md` file.

**0C. Verify:**
- [ ] `CLAUDE.md` exists at repo root
- [ ] `docs/PRD.md` exists
- [ ] Neither file is empty

Tell user: "Phase 0 complete — reference documents placed."

---

---

## PHASE 1 — Register.tsx: Discord OAuth Flow

File: `artifacts/vclol/src/pages/public/Register.tsx`

The current Register form sends directly to `POST /api/players` which is admin-only. The new flow requires Discord OAuth first.

Replace the entire form content with a two-step UI:

**Step 1 — Discord (shown first):**
```tsx
<div className="space-y-4">
  <div className="text-center space-y-2">
    <h2 className="text-xl font-display font-bold">Step 1: Connect Discord</h2>
    <p className="text-sm text-muted-foreground">
      Your Discord account verifies your identity on the platform.
    </p>
  </div>
  <a
    href="/auth/discord"
    className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg text-white font-semibold text-base transition-opacity hover:opacity-90"
    style={{ backgroundColor: "#5865F2" }}
  >
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
    Continue with Discord
  </a>
  <p className="text-xs text-muted-foreground text-center">
    Already registered?{" "}
    <a href="/login" className="text-primary hover:underline">Login here →</a>
  </p>
</div>
```

Below the Discord button, add a collapsed "Step 2 (after Discord)" preview so users know what's next:
```tsx
<div className="mt-6 p-4 rounded-lg bg-muted/20 border border-border/30 opacity-50">
  <p className="text-xs text-muted-foreground text-center">
    Step 2: Verify your Riot ID — you'll enter your Riot ID (e.g. Player#NA1) to link your LoL account.
  </p>
</div>
```

Remove the entire existing form (zod schema, useForm, all input fields, createPlayer mutation). Keep the PublicLayout wrapper and Card.

**PHASE 1 STOP:**
- [ ] Register page shows Discord OAuth button as primary action
- [ ] No form fields visible
- [ ] "Already registered? Login here" link present
- [ ] Step 2 preview shown as greyed-out hint
- [ ] No TypeScript errors

Tell user: "Phase 1 complete."

---

## PHASE 2 — PlayerLogin.tsx: Add Dev Login Link

File: `artifacts/vclol/src/pages/public/PlayerLogin.tsx`

Below the "New player? Register here →" line, add:

```tsx
<p className="text-xs text-muted-foreground text-center mt-2">
  Developer?{" "}
  <a href="/dev-login" className="text-yellow-400 hover:underline opacity-70">
    Dev Login →
  </a>
</p>
```

**PHASE 2 STOP:**
- [ ] Dev Login link visible on login page

Tell user: "Phase 2 complete."

---

## PHASE 3 — PlayerDashboard.tsx: Upload Replay Button

File: `artifacts/vclol/src/pages/public/PlayerDashboard.tsx`

### 3A. Add RoflUploadButton component

Add this component before `DashboardContent`:

```tsx
function RoflUploadButton({ matchId, matchDate }: { matchId: number; matchDate: string }) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Estimate patch expiry: ~14 days from match date
  const expiryDate = new Date(new Date(matchDate).getTime() + 14 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const expired = daysLeft <= 0;

  if (expired) {
    return <span className="text-xs text-muted-foreground/50 italic">Replay expired</span>;
  }

  if (done) {
    return <span className="text-xs text-green-400">✓ Uploaded</span>;
  }

  return (
    <div className="flex items-center gap-1">
      <input
        ref={fileRef}
        type="file"
        accept=".rofl"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const formData = new FormData();
            formData.append("rofl", file);
            formData.append("matchId", String(matchId));
            const res = await fetch("/api/replays", { method: "POST", body: formData });
            if (res.ok) setDone(true);
          } finally {
            setUploading(false);
          }
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="text-xs text-primary hover:underline disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload .rofl"}
      </button>
      {daysLeft <= 3 && (
        <span className="text-xs text-yellow-400">({daysLeft}d left)</span>
      )}
    </div>
  );
}
```

Add `useRef` to React imports.

### 3B. Add Upload button to Recent Results rows

In the Recent Results `map`, find the match row `<div className="flex items-center justify-between ...">`.

After the ELO delta `<span>`, add:
```tsx
<RoflUploadButton matchId={m.id} matchDate={m.createdAt} />
```

**PHASE 3 STOP:**
- [ ] Each match row in Recent Results has Upload .rofl button
- [ ] Expired replays show "Replay expired" text
- [ ] Uploads within 3 days show yellow countdown
- [ ] Upload triggers file picker for .rofl files only
- [ ] No TypeScript errors

Tell user: "Phase 3 complete."

---

## PHASE 4 — PlayerDashboard.tsx: Challenge Decline Quota UI

File: `artifacts/vclol/src/pages/public/PlayerDashboard.tsx`

In the Pending Challenges section, find the Decline button:
```tsx
<Button size="sm" variant="outline" onClick={() => declineChallenge.mutate({ id: c.id })}>Decline</Button>
```

Replace with:
```tsx
{/* TODO: when backend returns 403 on decline (quota reached), hide this button */}
<Button
  size="sm"
  variant="outline"
  onClick={() =>
    declineChallenge.mutate(
      { id: c.id },
      {
        onError: (err: any) => {
          if (err?.status === 403) {
            toast.error("Decline limit reached — this challenge has been auto-accepted.");
          }
        },
      }
    )
  }
>
  Decline
</Button>
```

**PHASE 4 STOP:**
- [ ] Decline button handles 403 error with toast message
- [ ] No TypeScript errors

Tell user: "Phase 4 complete."

---

## PHASE 5 — ManageLadderSettings.tsx: New Config Fields

File: `artifacts/vclol/src/pages/admin/ManageLadderSettings.tsx`

Read the current file fully before editing.

Add the following fields to the ladder settings form (after existing fields):

```tsx
<Field
  label="Max Declines Per Week"
  hint="How many challenges a player can decline per week (across all challengers)"
  type="number"
  value={lForm.maxDeclinesPerWeek ?? 2}
  onChange={(v) => setLForm((f) => ({ ...f, maxDeclinesPerWeek: Number(v) }))}
/>
<Field
  label="Max Declines vs Same Opponent Per Week"
  hint="How many times a player can decline the same challenger per week"
  type="number"
  value={lForm.maxDeclinesSameOpponentPerWeek ?? 1}
  onChange={(v) => setLForm((f) => ({ ...f, maxDeclinesSameOpponentPerWeek: Number(v) }))}
/>
<Field
  label="No-Show Expiry (Days)"
  hint="Days after accepted challenge before it's flagged as no-show"
  type="number"
  value={lForm.noShowExpiryDays ?? 7}
  onChange={(v) => setLForm((f) => ({ ...f, noShowExpiryDays: Number(v) }))}
/>
<Field
  label="Playoff Min Players"
  hint="Minimum qualified players needed to run a playoff"
  type="number"
  value={lForm.playoffMinPlayers ?? 4}
  onChange={(v) => setLForm((f) => ({ ...f, playoffMinPlayers: Number(v) }))}
/>
<Field
  label="Playoff Size"
  hint="Number of players in the playoff bracket (4 or 8)"
  type="number"
  value={lForm.playoffSize ?? 8}
  onChange={(v) => setLForm((f) => ({ ...f, playoffSize: Number(v) }))}
/>
<Field
  label="Playoff Format"
  hint="Bracket format for playoffs"
  type="text"
  value={lForm.playoffFormat ?? "single_elimination"}
  onChange={(v) => setLForm((f) => ({ ...f, playoffFormat: v }))}
/>
```

Add these fields to the lForm state initializer with their defaults. Include them in the save mutation payload.

**Note:** These fields don't exist in the DB yet. The UI should render them. Claude Code will add the DB columns and backend support. If the API returns undefined for these fields, the default values in the form will show.

**PHASE 5 STOP:**
- [ ] New fields visible in ManageLadderSettings
- [ ] Form initializes with sensible defaults
- [ ] Fields included in save payload
- [ ] No TypeScript errors

Tell user: "Phase 5 complete."

---

## PHASE 6 — ManageVods.tsx: Render Queue Panel

File: `artifacts/vclol/src/pages/admin/ManageVods.tsx`

Read the current file fully before editing.

Add a "Render Queue" section ABOVE the existing VOD list:

```tsx
{/* Render Queue */}
<div className="mb-8">
  <h2 className="text-xl font-display font-bold mb-4">Render Queue</h2>
  <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
    <div className="p-4 border-b border-border/30 bg-muted/20">
      <p className="text-sm text-muted-foreground">
        .rofl files waiting to be rendered and uploaded to YouTube.
        Render machine must be running on your Windows PC.
      </p>
    </div>
    {/* Placeholder — Claude Code will wire up the actual API */}
    <div className="p-8 text-center text-muted-foreground text-sm">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-border/40">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
        Render queue API not yet connected — Claude Code will implement
      </div>
    </div>
  </div>
</div>
```

**PHASE 6 STOP — FINAL VERIFICATION:**

- [ ] Register page: Discord OAuth button, no form
- [ ] PlayerLogin: Dev Login link visible
- [ ] PlayerDashboard Recent Results: Upload .rofl button on each match row
- [ ] PlayerDashboard Pending Challenges: Decline button handles 403 with toast
- [ ] ManageLadderSettings: New fields (decline limits, no-show expiry, playoff config)
- [ ] ManageVods: Render Queue placeholder section visible
- [ ] App compiles without TypeScript errors

Tell user: **"All Replit tasks complete. Ready for Claude Code handoff."**
