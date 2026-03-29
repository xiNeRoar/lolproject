# VCLoL — 5v5 Scrim Recording Platform

## What This Is

VCLoL is the missing infrastructure between solo queue and organized competitive play for serious amateur League of Legends players in NA. A Discord bot ingests .rofl replay files to record verified match results; a website displays team profiles, player career resumes, and match stats with a 3-layer privacy model. RSO (Riot Sign On) is the identity layer — zero impersonation tolerance.

## Core Value

Every match submitted via .rofl produces a verified, permanent competitive record that cannot be faked — the "team play resume" that OP.GG cannot provide.

## Requirements

### Validated

- ✓ Discord bot with 11 slash commands — existing
- ✓ .rofl parsing with ROFL2 validation, game mode check, duplicate detection — existing
- ✓ Team management (create, roster auto-add, captain transfer, leave/remove) — existing
- ✓ Match recording with identity resolution (PUUID → RiotId → new player) — existing
- ✓ Scoreboard image rendering for Discord embeds — existing
- ✓ Team ELO system (tournament/event only, not scrims) — existing
- ✓ Season broadcast + team inactivity scheduler — existing
- ✓ Notification poller with retry/backoff — existing
- ✓ Ban system (player + team level) — existing
- ✓ Admin panel — existing
- ✓ Discord OAuth login for website — existing
- ✓ Bot /connect command generating RSO auth session tokens — existing
- ✓ Player profile privacy toggle (public/private) — existing
- ✓ Leaderboard with W/L sort — existing
- ✓ Captain Hub — existing
- ✓ VOD system — existing
- ✓ Drizzle schema aligned with SCHEMA_CONTRACT.md — existing
- ✓ Docker deployment via Portainer — existing
- ✓ DB schema sync (match_type, tournament_code columns) — v3.1
- ✓ OAuth CSRF state parameters on all auth flows — v3.1
- ✓ CORS restricted to production domain — v3.1
- ✓ RSO token non-persistence (only PUUID saved) — v3.1
- ✓ Session secret enforced in production — v3.1
- ✓ Match visibility endpoint session-only auth — v3.1
- ✓ 3-layer privacy model (privacyGate.ts) — v3.1
- ✓ Match detail scrim privacy gate — v3.1
- ✓ Tournament/event match public bypass — v3.1
- ✓ Player search rsoOptIn filter — v3.1
- ✓ Player profile visibility gates — v3.1
- ✓ VOD 7-day auto-public bug fixed — v3.1
- ✓ GET /players N+1 query eliminated — v3.1
- ✓ OpenAPI spec aligned with all auth endpoints — v3.1
- ✓ Codegen regenerated with privacy + pagination types — v3.1
- ✓ eloHistory schema resolved (team-only, no playerId) — v3.1

- ✓ /auth/me returns hasPuuid + rsoOptIn fields — v3.2
- ✓ Per-team W/L + KDA stats endpoint (GET /players/:id/team-stats) — v3.2
- ✓ GitHub issue #198 corrected with proper API paths — v3.2
- ✓ Frontend issues opened (#225 pagination, #226 VOD privacy, #227 profile 403) — v3.2
- ✓ Design system documented (docs/DESIGN_GUIDE.md) — v3.2
- ✓ Full-stack Claude ownership established — v3.2
- ✓ Codegen synced with all v3.2 spec changes — v3.2

- ✓ useAuth() forwards hasPuuid/rsoOptIn — v3.3
- ✓ Paginated response unwrap in Players/Matches/Vods — v3.3
- ✓ vods.ts implicit-any TS errors fixed — v3.3
- ✓ VOD privacy graceful degradation (#226) — v3.3
- ✓ Profile 403 detection fix (#227) — v3.3
- ✓ App-level React error boundary — v3.3
- ✓ RSO OAuth backend handlers (connect/:token, /rso, /rso/callback) — v3.3
- ✓ PostgreSQL-backed session store (connect-pg-simple) — v3.3
- ✓ Per-team career stat cards on PlayerProfile — v3.3
- ✓ RSO Connect page (/connect?token=xxx) — v3.3
- ✓ Dashboard "Verify with Riot" CTA — v3.3

### Active

- [ ] Frontend overhaul based on deep UX research (see docs/DEEP_UX_SYNTHESIS.md)
- [ ] Match cards redesign (champion composition, win/loss tints, score-first)
- [ ] Player profile redesign (summary line, activity heatmap, verified badge)
- [ ] Progressive dashboard (different UX for 0/5/50 matches)
- [ ] Onboarding checklist for all players
- [ ] Privacy controls UI (preview-as-visitor, visibility toggles)
- [ ] Cmd+K global search implementation
- [ ] Mobile-responsive data display

## Current Milestone: Planning next milestone

**Previous:** v3.3 Frontend Launch — shipped 2026-03-29 (12/12 requirements, audit passed)

### Out of Scope

- Mobile app — web-first, mobile later
- Real-time chat — Discord handles communication
- Scrim matchmaking — Discord handles scheduling
- Player individual ELO — team ELO only, player = resume model
- Non-NA servers — NA only at launch
- Below Platinum players — Diamond+ target demographic
- VOD rendering pipeline — separate Windows PC infrastructure, not in this milestone

## Context

- **Brownfield project:** ~25k+ lines of TypeScript across pnpm monorepo
- **Single AI agent:** Claude owns full stack (backend, bot, frontend, docs)
- **Branch:** `variant` (not main)
- **Deploy:** Portainer on Oracle Cloud ARM64 VPS, no SSH
- **Current state:** v3.3 shipped — RSO OAuth live, career cards on profile, error handling, session persistence. Deep UX research completed (5 docs in docs/DEEP_*.md)
- **Open issues:** Frontend overhaul needed based on cross-industry UX research (35 recommendations in docs/DEEP_UX_SYNTHESIS.md)
- **Next step:** v4.0 Frontend Overhaul — redesign all pages based on deep UX research findings

## Constraints

- **Riot Policy:** Custom game data private by default; 3-layer privacy model required
- **RSO Dependency:** Production key requires Riot approval; build with placeholder, swap on approval
- **Ownership:** Claude owns full stack. Frontend follows `docs/DESIGN_GUIDE.md` conventions.
- **No SSH:** All deployment via Portainer Web editor only
- **ARM64:** Docker BuildKit broken on ARM64, use stock images + Web editor paste

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Team ELO, not player ELO | Players = resume model; ELO belongs to team entity | ✓ Good |
| Bot direct DB access (not HTTP API) | Lower latency, transaction safety, simpler for solo dev | ✓ Good |
| .rofl submission bot-only | Preserves viral loop in Discord scrim servers | ✓ Good |
| RSO as launch requirement | Zero impersonation tolerance per Riot policy | — Pending (awaiting Riot approval) |
| 3-layer privacy model | Riot compliance + user trust | ✓ Good — privacyGate.ts shipped (v3.1) |
| Default visibility = private | Conservative default per PRD v3.1; null = private permanently (D-11) | ✓ Good |
| RSO tokens: keep columns, don't populate now | VCLoL only needs PUUID today. Columns stay for Tournament API. | — Pending (trigger: Tournament API milestone) |
| Shared formatMatch pattern | Single source of truth for match response shape | ✓ Good — formatters.ts shipped (v3.1) |
| Participant check via match_players | More accurate than team_members for visibility | ✓ Good (D-03, v3.1) |
| visibleAfter null = private | Conservative default, captain controls via /visibility | ✓ Good (D-11, v3.1) |
| Full-stack Claude ownership | Replit no longer active on project; Claude takes frontend ownership with design guide as canonical reference | ✓ Good (v3.2) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 after v3.3 milestone completion*
