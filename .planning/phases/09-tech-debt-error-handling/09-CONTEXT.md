# Phase 9: Tech Debt + Error Handling - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Fix broken pages and hooks before any new feature work. useAuth() must forward hasPuuid/rsoOptIn, pagination pages must unwrap {data, total, page, totalPages} responses, vods.ts must have zero TS7006 errors, and error states must show user-friendly messages.

Research confirmed: Players.tsx and Matches.tsx currently crash/show empty because they treat paginated responses as arrays. useAuth() drops 2 of 8 AuthMeResponse fields. vods.ts has 21 implicit-any errors on lambda parameters.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — pure mechanical fixes. Use ROADMAP success criteria and research findings to guide.

### Key Research Findings (from .planning/research/)
- useAuth() fix: add `hasPuuid: data?.hasPuuid ?? false, rsoOptIn: data?.rsoOptIn ?? false` to return object in use-auth.ts
- Pagination fix: unwrap `response.data` in Players.tsx and Matches.tsx instead of treating response as array
- vods.ts: add explicit types to 21 lambda parameters (lines 92-199, 276)
- ERR-01 (VOD privacy): check error response and show graceful message
- ERR-02 (Profile 403): PlayerProfile.tsx may already have isPrivate guard — verify before building
- ERR-03 (Error boundary): React error boundary at App level for unhandled API errors

</decisions>

<code_context>
## Existing Code Insights

- `artifacts/vclol/src/hooks/use-auth.ts` — useAuth() hook, lines 44-52 return object
- `artifacts/vclol/src/pages/Players.tsx` — uses useListPlayers(), treats as array
- `artifacts/vclol/src/pages/Matches.tsx` — uses useListMatches(), treats as array
- `artifacts/api-server/src/routes/vods.ts` — 21 TS7006 errors on lambda params
- `artifacts/vclol/src/pages/PlayerProfile.tsx` — has isPrivate guard (lines 162-206)
- `lib/api-client-react/src/generated/api.schemas.ts` — AuthMeResponse with hasPuuid/rsoOptIn

</code_context>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
