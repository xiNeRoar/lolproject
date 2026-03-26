# VCLoL — 5v5 Scrim Recording Platform

## What This Is

VCLoL is the missing infrastructure between solo queue and organized competitive play for serious amateur League of Legends players in NA. A Discord bot ingests .rofl replay files to record verified match results; a website displays team profiles, player career resumes, and match stats with a 3-layer privacy model. RSO (Riot Sign On) is the identity layer — zero impersonation tolerance.

## Core Value

Every match submitted via .rofl produces a verified, permanent competitive record that cannot be faked — the "team play resume" that OP.GG cannot provide.

## Requirements

### Validated

- ✓ Discord bot with 11 slash commands (register-team, submit, stats, roster, connect, visibility, transfer-captain, leave, remove, register-event, claim-match) — existing
- ✓ .rofl parsing with ROFL2 validation, game mode check, duplicate detection — existing
- ✓ Team management (create, roster auto-add from .rofl, captain transfer, leave/remove) — existing
- ✓ Match recording with identity resolution (PUUID → RiotId → new player) — existing
- ✓ Scoreboard image rendering for Discord embeds with canvas fallback — existing
- ✓ Team ELO system (tournament/event only, not scrims) — existing
- ✓ Season broadcast + team inactivity scheduler — existing
- ✓ Notification poller with retry/backoff — existing
- ✓ Ban system (player + team level) — existing
- ✓ Admin panel (manage players, teams, events, seasons, bans, action log) — existing
- ✓ Discord OAuth login for website — existing
- ✓ Bot /connect command generating RSO auth session tokens — existing
- ✓ Player profile privacy toggle (public/private) — existing
- ✓ Leaderboard with W/L sort (ELO removed for scrims) — existing
- ✓ Captain Hub (visibility toggles, roster management, team settings) — existing
- ✓ VOD system (watch page, vod detail, replay submissions) — existing
- ✓ Drizzle schema aligned with SCHEMA_CONTRACT.md (21 tables) — existing
- ✓ Docker deployment via Portainer (bot + web stacks) — existing

### Active

- [ ] Website RSO OAuth handler (/connect page + /auth/rso callback) — launch blocker
- [ ] Match detail scrim privacy gate (non-participants see Team A vs B + score only) — launch blocker
- [ ] Player search filter by rsoOptIn (hide non-opted players) — launch blocker
- [ ] Player profile career resume layout (per-team W/L + KDA, remove ELO trajectory)
- [ ] Login flow RSO connect step
- [ ] DB schema sync (match_type column missing — #221 P0)
- [ ] GET /players N+1 query optimization (#217)
- [ ] OpenAPI spec alignment (auth endpoints mismatch actual routes)
- [ ] eloHistory schema — playerId removed but docs say keep for backward compat
- [ ] Tournament/event match visibility bypass (Layer 3 — public by design)

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
- **Two AI agents:** Claude owns backend/bot/docs, Replit owns frontend (`artifacts/vclol/src/`)
- **Branch:** `variant` (not main)
- **Deploy:** Portainer on Oracle Cloud ARM64 VPS, no SSH
- **Pre-launch state:** Bot fully functional, website mostly functional, RSO pending Riot approval
- **Open issues:** 7 (2 Claude backend, 5 Replit frontend)
- **REQUESTS.md:** 2 backend requests from Replit (N+1 query + schema sync)
- **Key gap:** Website RSO flow is the critical missing piece for launch

## Constraints

- **Riot Policy:** Custom game data private by default; 3-layer privacy model required
- **RSO Dependency:** Production key requires Riot approval; build with placeholder, swap on approval
- **Ownership Boundary:** Claude never edits `artifacts/vclol/src/`, Replit never edits backend/bot/docs
- **No SSH:** All deployment via Portainer Web editor only
- **ARM64:** Docker BuildKit broken on ARM64, use stock images + Web editor paste

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Team ELO, not player ELO | Players = resume model; ELO belongs to team entity | ✓ Good |
| Bot direct DB access (not HTTP API) | Lower latency, transaction safety, simpler for solo dev | ✓ Good |
| .rofl submission bot-only | Preserves viral loop in Discord scrim servers | ✓ Good |
| RSO as launch requirement | Zero impersonation tolerance per Riot policy | — Pending (awaiting Riot approval) |
| 3-layer privacy model | Riot compliance + user trust | — Pending (frontend gates not complete) |
| Default visibility = private | Conservative default per PRD v3.1 | ✓ Good |

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
*Last updated: 2026-03-26 after initialization*
