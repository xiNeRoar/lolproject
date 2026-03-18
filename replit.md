# Vancouver Competitive LoL Project (VCLoL)

## Overview

Full-stack competitive gaming hub for Vancouver / Lower Mainland League of Legends players. Supports interest collection, events, match results, VOD archive, ELO ladder, player profiles, seasons, and VOD timestamps with a single-admin backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Frontend**: React 18 + Vite + Wouter (routing) — `artifacts/vclol`
- **UI**: Shadcn UI (Card, Badge, Button), Tailwind CSS, Framer Motion
- **Fonts**: Outfit (headings, `font-display`) + Inter (body) — loaded via Google Fonts in `src/index.css`
- **API Client**: `@workspace/api-client-react` — React Query hooks wrapping Express API (Orval codegen)
- **Backend**: Express 5 — `artifacts/api-server`
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Auth**: iron-session v8 + crypto (scrypt password hashing)
- **Package Manager**: pnpm

## Admin Credentials

- Email: `admin@vclol.gg`
- Password: `admin123`

## Project Structure

```text
artifacts/vclol/                   # React/Vite frontend
  src/
    pages/
      public/                      # Public pages
        Home.tsx                   # / — Homepage
        Events.tsx                 # /events
        EventDetail.tsx            # /events/:slug
        Results.tsx                # /results
        Vods.tsx                   # /vods
        VodDetail.tsx              # /vods/:id — VOD with timestamps + related
        Ladder.tsx                 # /ladder — ELO ladder
        PlayerProfile.tsx          # /players/:id — Player profile
        About.tsx                  # /about
        Contact.tsx                # /contact
        Interest.tsx               # /interest
      admin/                       # Admin pages (auth-protected)
        Login.tsx                  # /admin/login
        Dashboard.tsx              # /admin
        ManagePlayers.tsx          # /admin/players
        ManageSeasons.tsx          # /admin/seasons
        ManageInterests.tsx        # /admin/interests
        ManageEvents.tsx           # /admin/events
        ManageRegistrations.tsx    # /admin/registrations
        ManageMatches.tsx          # /admin/matches
        ManageVods.tsx             # /admin/vods
        ManageChallenges.tsx       # /admin/challenges
        ManageLadderSettings.tsx   # /admin/ladder-settings
      public/
        Register.tsx               # /register — player signup
        PlayerLogin.tsx            # /login — Discord login stub
        PlayerDashboard.tsx        # /dashboard — player stats + notification prefs
    components/
      layout/
        PublicLayout.tsx            # Nav (Home, Ladder, VODs, Events, About) + Footer
        AdminLayout.tsx            # Admin sidebar (Players, Seasons, Interests, Events, Registrations, Matches, Challenges, VODs, Ladder Settings)
      brackets/
        SingleEliminationBracket.tsx  # Pure HTML/CSS bracket rendering
        DoubleEliminationBracket.tsx
        SwissBracket.tsx
        MatchList.tsx
        GroupStageGrid.tsx
      ChallengeModal.tsx             # Shared modal for issuing ladder challenges
      ui/                          # Shadcn UI primitives

artifacts/api-server/              # Express 5 API
  src/
    routes/
      health.ts                    # GET /health
      admin.ts                     # /admin/login, /logout, /me, /stats
      players.ts                   # GET/POST /players, GET/PUT/DELETE /players/:id
      seasons.ts                   # GET/POST /seasons, GET/PUT/DELETE /seasons/:id, PUT /seasons/:id/activate
      ladder.ts                    # GET /ladder
      matches.ts                   # GET/POST /matches, PUT/DELETE /matches/:id (ELO auto-calc)
      vods.ts                      # GET/POST /vods, GET/PUT/DELETE /vods/:id, POST/DELETE timestamps
      events.ts                    # GET/POST /events, etc.
      interests.ts
      registrations.ts
    lib/
      elo.ts                       # calculateElo(), softResetElo(), LADDER_MIN_MATCHES, getPlayoffSize()
      vodRecommendations.ts        # getRelatedVods() — rule-based VOD recommendations
      auth.ts                      # hashPassword, verifyPassword
      session.ts                   # iron-session config

lib/
  db/                              # Drizzle schema + DB client
    src/schema/
      players.ts                   # playersTable (riotId, currentElo, peakElo, wins, losses)
      seasons.ts                   # seasonsTable (status, eloResetFactor)
      vodTimestamps.ts             # vodTimestampsTable (vodId, label, seconds, type)
      matches.ts                   # extended with playerAId/B, ELO before/after, seasonId, isPlayoff
      vodEntries.ts                # extended with playerId, champion, opponentChampion, position, patch
  api-spec/openapi.yaml            # OpenAPI 3.0 spec (source of truth for codegen)
  api-client-react/                # Orval-generated React Query hooks
  api-zod/                         # Orval-generated Zod validators (backend validation)
```

## Public Routes (nav order)

Home → Ladder → VODs → Events → About  (+  Login | Register CTA)
Player-facing: `/register`, `/login`, `/dashboard`

## ELO System

- Base ELO: 1000
- K-Factor: configurable via DB ladder_settings (default 32)
- Ladder requires ≥ `minMatchesForDisplay` matches to appear (from DB, not hardcoded)
- ELO auto-calculated on `POST /matches` when both `playerAId` and `playerBId` are linked
- Season activation applies soft ELO reset: `new_elo = 1000 + (old_elo - 1000) * factor`
- Playoff matches tracked with `isPlayoff` flag

## Admin Features

- **Players**: create/edit/delete players, track ELO + W/L; form includes email + notificationPreference
- **Seasons**: create/edit/delete, activate season (triggers ELO soft reset + ends previous active season)
- **Dashboard**: counts for players, seasons, interests, events, registrations, matches, VODs
- **Matches**: linked match records with automatic ELO computation; auto-opens with pre-filled players from Challenges page
- **VODs**: champion/position/patch/player metadata, timestamp management per VOD; GET joins players to populate playerRiotId
- **Events**: registration count shown per event on list page
- **Registrations**: Status column; Confirm / Withdraw / Delete actions (admin-only mutate endpoints)
- **Interests**: full CRUD

## Registration Flow

- GET /api/registrations is **public** (no auth required) — allows EventDetail Participants section to show registrations
- POST /api/registrations is public (open registration)
- PUT /api/registrations/:id/confirm and /withdraw require admin auth
- DELETE /api/registrations/:id requires admin auth
- EventDetail sidebar shows "Register as Player →" link instead of free-text form
- EventDetail Participants section: lists all registered players (riot IDs + status badges)

## Database Tables

Core: `admin_users`, `interest_submissions`, `events`, `event_registrations`, `matches`, `vod_entries`, `players`, `seasons`, `vod_timestamps`

Batch 2: `ladder_settings`, `admin_schedule_settings`, `challenges`, `elo_history`, `season_champions`, `player_badges`, `matchmaking_queue`

## Key Commands

```bash
pnpm --filter @workspace/db run push          # Push Drizzle schema to DB
pnpm --filter @workspace/api-spec run codegen # Regenerate API client + Zod hooks
pnpm --filter @workspace/api-server run dev   # Start Express API
pnpm --filter @workspace/vclol run dev        # Start Vite frontend
pnpm run typecheck:libs                       # Typecheck all lib packages
```

## Notes

- `lib/api-zod/src/index.ts` exports only from `./generated/api` (Zod schemas) — TypeScript interfaces from `./generated/types` are excluded to avoid duplicate-export conflicts
- Images use `${import.meta.env.BASE_URL}images/...` prefix for Replit proxy compatibility
- Admin is single-account only — seeded admin@vclol.gg / admin123
- VOD recommendations use rule-based matching: same matchup → same champion → same position
