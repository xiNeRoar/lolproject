# Phase 12: RSO Connect Page + Dashboard CTA - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous)

<domain>
## Phase Boundary

Wire the /connect page to the RSO backend (Phase 10) and surface a "Verify with Riot" CTA on the dashboard. The bot /connect command has been sending players to /connect?token=<uuid> since v3.1, but the page has been 404. This phase makes that link work.

Two new UI elements:
1. /connect page — receives token from URL, shows Riot verification prompt, initiates OAuth via full-page navigation (window.location.href to GET /api/auth/connect/:token), handles success/error states
2. Dashboard CTA — "Verify with Riot" banner when useAuth().hasPuuid is false (Phase 9 fixed useAuth to forward this field)

Research confirmed: RSO must use full-page navigation, NOT fetch/hooks. The backend does server-side redirects. After successful RSO callback, backend redirects to /dashboard?rso=success.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Follow docs/DESIGN_GUIDE.md for visual design, use existing shadcn/ui components.

### Key Constraints
- /connect page is a NEW route in App.tsx (Wouter)
- RSO OAuth initiates via window.location.href (full page nav), NOT React hook
- Success feedback: detect ?rso=success URL param on dashboard
- Error states: invalid/expired token, general OAuth failure
- Dashboard CTA: conditional on useAuth().hasPuuid === false

</decisions>

<canonical_refs>
## Canonical References

### Backend Routes (Phase 10)
- `artifacts/api-server/src/routes/auth.ts` — RSO handlers (connect/:token, /rso, /rso/callback)
### Design System
- `docs/DESIGN_GUIDE.md` — canonical design reference
### Auth Hook
- `artifacts/vclol/src/hooks/use-auth.ts` — useAuth() with hasPuuid field (Phase 9)
### Router
- `artifacts/vclol/src/App.tsx` — Wouter route registration

</canonical_refs>

<deferred>
## Deferred Ideas

None.

</deferred>
