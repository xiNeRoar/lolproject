# Phase 11: Player Career Resume - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous — smart discuss infrastructure detection)

<domain>
## Phase Boundary

Render per-team career stat cards on the PlayerProfile page using the existing useGetPlayerTeamStats hook. Each card shows team name, role, W/L record, and KDA averages. Duplicate team memberships (leave + rejoin) deduplicated into single card per team.

All infrastructure exists: backend endpoint live (GET /players/:id/team-stats), hook generated (useGetPlayerTeamStats), design spec in DESIGN_GUIDE.md (per-team career card pattern), schema fully defined (PlayerTeamStats with 12 properties). Only the rendering in PlayerProfile.tsx is missing.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion. Follow docs/DESIGN_GUIDE.md for visual design, use existing shadcn/ui components, integrate into the existing PlayerProfile.tsx page structure.

### Key Research Findings
- useGetPlayerTeamStats hook available at lib/api-client-react/src/generated/api.ts
- PlayerTeamStats schema has 12 fields: teamId, teamName, teamTag, role, status, wins, losses, avgKills, avgDeaths, avgAssists, gamesPlayed, joinedAt
- DESIGN_GUIDE.md specifies per-team career card pattern with Dark Charcoal + Steel Blue theme
- Deduplication: if API returns multiple rows for same teamId, merge into one card

</decisions>

<canonical_refs>
## Canonical References

### Design System
- `docs/DESIGN_GUIDE.md` — canonical design reference, per-team career card pattern
### Generated Hooks
- `lib/api-client-react/src/generated/api.ts` — useGetPlayerTeamStats hook
- `lib/api-client-react/src/generated/api.schemas.ts` — PlayerTeamStats type
### Target Page
- `artifacts/vclol/src/pages/public/PlayerProfile.tsx` — page to extend

</canonical_refs>

<deferred>
## Deferred Ideas

None.

</deferred>
