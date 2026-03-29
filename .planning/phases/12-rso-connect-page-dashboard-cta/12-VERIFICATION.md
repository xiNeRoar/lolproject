---
phase: 12-rso-connect-page-dashboard-cta
verified: 2026-03-29T03:38:25Z
status: passed
score: 6/6 must-haves verified
re_verification: false
---

# Phase 12: RSO Connect Page & Dashboard CTA Verification Report

**Phase Goal:** Players can complete RSO identity verification through the website -- the launch blocker that has been sending users to a 404 since v3.1
**Verified:** 2026-03-29T03:38:25Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Bot-generated /connect?token=uuid link renders a verification prompt with CTA button | VERIFIED | Connect.tsx line 89-126: token state renders ShieldCheck hero, "Verify Your Riot Account" heading, and Button with onClick navigating to /api/auth/connect/${token} |
| 2 | Clicking 'Verify with Riot' navigates the browser to /api/auth/connect/:token (full page, not fetch) | VERIFIED | Connect.tsx line 109: `window.location.href = \`${API_BASE}/api/auth/connect/${token}\``; no fetch/useQuery/axios calls exist in the file |
| 3 | Invalid or expired token shows a user-friendly error with recovery guidance | VERIFIED | Connect.tsx lines 18-47: ERROR_COPY Record with all 7 error codes (invalid_token, state_mismatch, missing_code, token_exchange_failed, account_fetch_failed, no_player, server_error); line 67-75: invalid_token shows Discord /connect hint; line 76-80: all errors show "Go to Dashboard" link |
| 4 | Dashboard shows yellow 'Riot Account not verified' banner with 'Verify with Riot' button when hasPuuid is false | VERIFIED | PlayerDashboard.tsx lines 121-137: condition checks riotId.startsWith("pending") or !player.puuid; renders yellow banner with AlertTriangle, body text, and anchor-tag CTA linking to /api/auth/rso |
| 5 | After RSO callback, dashboard detects ?rso=success and shows Sonner success toast | VERIFIED | PlayerDashboard.tsx lines 40-49: useEffect reads URLSearchParams, fires toast.success("Riot account verified") with description "Your identity is now confirmed. Welcome to VCLoL.", invalidates auth query cache via getGetAuthMeQueryKey() |
| 6 | URL is cleaned to /dashboard after toast fires (no ?rso=success lingering) | VERIFIED | PlayerDashboard.tsx line 46: `window.history.replaceState({}, "", "/dashboard")` called immediately after toast |

**Score:** 6/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `artifacts/vclol/src/pages/public/Connect.tsx` | RSO connect page with 3 states (token, error, fallback) | VERIFIED | 160 lines; contains window.location.href, all 7 error codes, 3 mutually exclusive render paths, PublicLayout wrapper |
| `artifacts/vclol/src/pages/public/PlayerDashboard.tsx` | CTA banner with verify button + success toast on ?rso=success | VERIFIED | 499 lines; banner at lines 121-137 with anchor CTA to /api/auth/rso; useEffect at lines 40-49 with toast + replaceState + cache invalidation |
| `artifacts/vclol/src/App.tsx` | Route registration for /connect | VERIFIED | Line 28: import Connect; Line 98: Route path="/connect" component={Connect} |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Connect.tsx | /api/auth/connect/:token | window.location.href | WIRED | Line 109: `window.location.href = \`${API_BASE}/api/auth/connect/${token}\`` |
| PlayerDashboard.tsx | /api/auth/rso | anchor href | WIRED | Line 130: `<a href={\`${API_BASE}/api/auth/rso\`}>` -- full-page navigation via anchor tag, not fetch |
| App.tsx | Connect.tsx | Wouter Route import | WIRED | Line 28: import; Line 98: `<Route path="/connect" component={Connect} />` |

### Data-Flow Trace (Level 4)

Connect.tsx is a static page that reads URL query parameters (token, error) and renders UI states -- no dynamic data fetching. The CTA button triggers a full-page navigation, not a data fetch. Data-flow trace is not applicable for this component.

PlayerDashboard.tsx CTA banner condition (`!player.puuid`) depends on data from `useGetPlayerById(pid)` which is already wired and verified in prior phases. The RSO success detection reads `window.location.search` directly -- no data source needed.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Connect.tsx | token, error (URL params) | window.location.search | N/A (static URL parsing) | FLOWING |
| PlayerDashboard.tsx (banner) | player.puuid | useGetPlayerById API hook | Yes (API endpoint verified in prior phases) | FLOWING |
| PlayerDashboard.tsx (toast) | rso=success (URL param) | window.location.search | N/A (static URL parsing) | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED (no runnable entry points -- this is a frontend React SPA that requires Vite dev server and backend API to be running; verification of rendering behavior routes to human verification)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RSO-02 | 12-01-PLAN | /connect page renders with token from URL, initiates RSO OAuth via full-page navigation | SATISFIED | Connect.tsx exists with 3 states, window.location.href navigates to /api/auth/connect/:token, all 7 error codes have user-friendly copy |
| RSO-04 | 12-01-PLAN | Dashboard shows RSO connect CTA when hasPuuid is false | SATISFIED | PlayerDashboard.tsx lines 121-137: yellow banner with "Verify with Riot" button links to /api/auth/rso; useEffect detects ?rso=success and fires toast + cleans URL |

No orphaned requirements found -- REQUIREMENTS.md maps only RSO-02 and RSO-04 to Phase 12, both claimed by the plan.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | No anti-patterns detected in any of the 3 files |

All three files (Connect.tsx, PlayerDashboard.tsx, App.tsx) are clean:
- Zero TODO/FIXME/HACK/PLACEHOLDER comments
- Zero empty return stubs
- Zero console.log statements
- Zero hardcoded empty data patterns
- No fetch/AJAX calls in Connect.tsx (correct -- uses window.location.href)

### UI-SPEC Compliance

| Dimension | Status | Details |
|-----------|--------|---------|
| Copywriting | PASS | All headings, body text, button labels, error copy, and toast messages match UI-SPEC Copywriting Contract exactly |
| Layout | PASS | PublicLayout wrapper, max-w-sm mx-auto px-4 pt-24 pb-16 container, Card with border-border/40 bg-card/60 -- matches PlayerLogin pattern |
| Typography | PASS | text-2xl font-display font-bold headings, text-sm body, text-xs labels -- all match spec |
| Color | PASS | text-primary for ShieldCheck, text-destructive for ShieldAlert, yellow-400 series for warning banner |
| Icons | PASS | ShieldCheck (hero + button), ShieldAlert (error), ArrowRight (CTA suffix), AlertTriangle (dashboard warning) |
| Responsive | PASS | Dashboard CTA: flex-wrap container, w-full sm:w-auto on button anchor |
| Interaction | PASS | Full-page navigation via window.location.href (Connect) and anchor href (Dashboard) -- no fetch/AJAX |
| Privacy text | PASS | Uses &mdash; (em dash entity) instead of -- (double hyphen); typographic upgrade, semantically identical |

### Human Verification Required

### 1. Connect Page Visual Rendering

**Test:** Navigate to /connect?token=test-uuid in a browser. Verify the page shows centered card with ShieldCheck icon, "Verify Your Riot Account" heading, and blue "Verify with Riot" button.
**Expected:** Card layout matches PlayerLogin.tsx aesthetic. Button is full-width within card. Privacy text appears below button in muted color.
**Why human:** Visual layout, spacing proportions, and color rendering cannot be verified by grep.

### 2. Connect Page Error State

**Test:** Navigate to /connect?error=invalid_token. Verify the page shows ShieldAlert icon in red, "Link Expired or Invalid" heading, Discord /connect hint, and "Go to Dashboard" button.
**Expected:** Error copy matches UI-SPEC table. /connect code element has primary color background tint.
**Why human:** Visual rendering of error state and code element styling.

### 3. Dashboard CTA Banner Interaction

**Test:** Log in as a player without PUUID. Verify yellow banner appears with "Verify with Riot" button. Click button.
**Expected:** Full-page navigation to /api/auth/rso (browser URL changes, not an AJAX popup). Button is responsive -- full-width on mobile, auto-width on desktop.
**Why human:** Requires running server with Discord OAuth session and checking responsive behavior.

### 4. RSO Success Toast Flow

**Test:** Navigate to /dashboard?rso=success while logged in.
**Expected:** Sonner toast appears with "Riot account verified" title and "Your identity is now confirmed. Welcome to VCLoL." description. URL cleans to /dashboard (no ?rso=success). If banner was showing, it disappears after cache invalidation.
**Why human:** Toast animation, timing, and cache invalidation side effects require live app.

### Gaps Summary

No gaps found. All 6 observable truths verified. All 3 artifacts pass existence (Level 1), substantive content (Level 2), and wiring (Level 3) checks. All 3 key links are confirmed wired. Both requirements (RSO-02, RSO-04) are satisfied. No anti-patterns detected. UI-SPEC copywriting contract fully matched across all 7 error codes, 6 connect page copy elements, and 5 dashboard copy elements.

The implementation follows the plan exactly as written with zero deviations. The commit history confirms two atomic task commits (eb59f2b, b84104d) matching the plan structure.

---

_Verified: 2026-03-29T03:38:25Z_
_Verifier: Claude (gsd-verifier)_
