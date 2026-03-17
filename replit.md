# Vancouver Competitive LoL Project (VCLoL)

## Overview

Full-stack competitive gaming hub for Vancouver / Lower Mainland League of Legends players. Supports interest collection, events, match results, and a VOD archive with a single-admin backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Frontend**: React 18 + Vite + Wouter (routing) — `artifacts/vclol`
- **UI**: Shadcn UI (Card, Badge, Button), Tailwind CSS, Framer Motion
- **Fonts**: Outfit (headings, `font-display`) + Inter (body) — loaded via Google Fonts in `src/index.css`
- **API Client**: `@workspace/api-client-react` — React Query hooks wrapping Express API
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
        Home.tsx                   # / — Homepage (hero + section divider + features + previews)
        Events.tsx                 # /events
        EventDetail.tsx            # /events/:slug
        Results.tsx                # /results (search + event filter)
        Vods.tsx                   # /vods (search + event + format + role filters)
        About.tsx                  # /about
        Contact.tsx                # /contact
        InterestForm.tsx           # /interest (sign-up form)
      admin/                       # Admin pages (auth-protected)
        Login.tsx                  # /admin/login
        Dashboard.tsx              # /admin — Dashboard with stats
        AdminInterests.tsx
        AdminEvents.tsx
        AdminEventForm.tsx
        AdminRegistrations.tsx
        AdminMatches.tsx
        AdminMatchForm.tsx
        AdminVods.tsx
        AdminVodForm.tsx
    components/
      layout/
        PublicLayout.tsx            # Nav + Footer wrapper
        AdminLayout.tsx            # Admin sidebar + layout
      ui/                          # Shadcn UI primitives
    lib/
      utils.ts                     # cn, formatDate, formatDateTime
  public/
    images/
      hero-bg.png                  # Esports arena with blue lightning (16:9)
      section-divider.png          # Hextech circuit divider (16:9)
      features-bg.png              # Summoner's Rift top-down map (16:9)
      results-header.png           # LoL trophy with blue glow (16:9)

artifacts/api-server/              # Express 5 API
  src/
    routes/                        # /admin, /interests, /events, /registrations, /matches, /vods
    middleware/                    # auth (iron-session)

lib/db/                            # Shared Drizzle DB + schema
scripts/src/seed.ts               # Database seed script
```

## Public Routes (nav order)

Home → Events → Results → VODs → About → Contact  (+  "Join Interest List" CTA button)

## Page Images

Each public page uses LoL-themed generated images:
- **Home hero**: `hero-bg.png` at 55% opacity — esports arena, dramatic blue lightning
- **Home section divider**: `section-divider.png` at 60% opacity — hextech circuit strip
- **Home features background**: `features-bg.png` at 8% opacity — Summoner's Rift map
- **Home featured event card**: `results-header.png` strip at 70% opacity — golden LoL trophy
- **Events page header**: `hero-bg.png` at 45% opacity
- **Results page header**: `results-header.png` at 70% opacity — trophy clearly visible

Image paths use `${import.meta.env.BASE_URL}images/<filename>`.

## Admin Features

- Dashboard with counts + recent items for all 5 data categories
- Interests: view all submissions (riot ID, discord, rank, city, format, availability, hasTeam, willingWithoutPrize, notes), delete
- Events: create, edit, delete; fields: title, slug (auto), format, date, status, descriptions, rules, prize pool
- Registrations: view all with linked event, delete
- Match Results: create, edit, delete; with optional event link, side A/B, winner, score, format, VOD URL
- VOD Archive: create, edit, delete; with optional event link, format, role tag, player names, notes

## Database Tables

`admin_users`, `interest_submissions`, `events`, `event_registrations`, `matches`, `vod_entries`

## Seed Data (as of last seed)

- 2 events (1v1 Open, In-House)
- 3 matches (Quarterfinal 1, Quarterfinal 2, Grand Final)
- 3 VODs (matching the matches)
- 2 interest submissions

## Running Locally

```bash
pnpm install
pnpm --filter @workspace/db run migrate
pnpm --filter @workspace/scripts run seed
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/vclol run dev
```

## Notes

- Event registration status options: `open`, `upcoming`, `closed`, `invite-only`
- Nav order: Home, Events, Results, VODs, About, Contact (exact)
- Interest form includes `hasTeam` (yes/no) and `willingWithoutPrize` (yes/no) fields
- Results page filters: search + event
- VOD Archive filters: search + event + format + role tag
- Admin is single-account only (seeded admin@vclol.gg / admin123)
- BASE_URL: all image refs use `${import.meta.env.BASE_URL}images/...`
