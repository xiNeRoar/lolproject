# Vancouver Competitive LoL Project (VCLoL)

A 5v5 team scrim recording platform for Vancouver / Lower Mainland League of Legends players. Discord Bot handles team registration and replay submissions; this website displays team profiles, player profiles, match stats, leaderboard, and VOD archives.

## Stack

- **Frontend:** React + Vite (SPA)
- **Routing:** Wouter
- **UI:** Shadcn UI + Tailwind CSS v4
- **Animations:** Framer Motion
- **Backend:** Express.js (REST API)
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Express session (admin), localStorage player auth (Discord OAuth planned)
- **Package Manager:** pnpm (monorepo)
- **Fonts:** Outfit (display) + Inter (body)

## Public Pages

| Route | Page |
|-------|------|
| `/` | Home — hero, stats bar, feature blocks, upcoming events, recent VODs, Discord CTA |
| `/about` | About the project |
| `/register` | How to add the Discord bot and register a team |
| `/login` | Player login (Discord OAuth, dev login available) |
| `/dashboard` | Player dashboard — stats, teams, recent matches |
| `/teams` | Team Ladder — ELO rankings per season |
| `/teams/:id` | Team Profile — roster (with captain badge), match history, VODs |
| `/players/:riotId` | Player Profile — stats, champion pool, match history, championships |
| `/events` | Event listing with champion splash banners |
| `/events/:slug` | Event detail + bracket/standings |
| `/vods` | VOD archive with search, event, format filters |
| `/vods/:id` | VOD detail with embedded YouTube, timestamps, related VODs |
| `/matches/:id` | Match detail — player stats, VODs, .rofl download, POV request, visibility toggle |
| `/contact` | Contact information (Discord + Email) |

## Admin Pages (protected — single admin account)

| Route | Page |
|-------|------|
| `/admin/login` | Admin login |
| `/admin` | Dashboard — counts + recent items |
| `/admin/events` | CRUD for events |
| `/admin/events/:id` | Event detail management |
| `/admin/registrations` | View + manage event registrations |
| `/admin/matches` | CRUD for match results |
| `/admin/vods` | CRUD for VOD entries |
| `/admin/players` | Manage players |
| `/admin/teams` | Manage teams |
| `/admin/seasons` | Manage seasons |
| `/admin/seasons/:id` | Season detail management |
| `/admin/ladder-settings` | Configure ladder parameters |

**Admin credentials:** `admin@vclol.gg` / `admin123`

## Development Setup

```bash
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/scripts run seed
pnpm --filter @workspace/vclol run dev
pnpm --filter @workspace/api-server run dev
```

## Project Structure

```
artifacts/
  vclol/              # React + Vite frontend (SPA)
    src/
      pages/
        public/       # Home, Teams, Players, Events, VODs, Matches, etc.
        admin/        # Dashboard, CRUD pages, Login
      components/
        layout/       # PublicLayout, AdminLayout
        ui/           # Shadcn components
      hooks/          # use-auth
      lib/            # lol-utils, tournament-formats
  api-server/         # Express.js REST API
    src/
      routes/         # matches, teams, players, events, vods, replays, etc.
      lib/            # elo, vodRecommendations
      middlewares/    # requireAdmin
lib/
  db/                 # Drizzle ORM schema + client
  api-spec/           # OpenAPI spec + codegen
  api-zod/            # Generated Zod schemas
  api-client-react/   # Generated React Query hooks
```

## Key Features

- **Team ELO System:** Teams gain/lose ~32 points per match, adjusted by opponent ELO
- **Season System:** Seasons with configurable ladder, minimum match requirements, playoff qualification
- **Match Detail:** Per-player K/D/A, CS, gold, damage, vision stats parsed from .rofl replays
- **.rofl Download:** 2-week window to download replay files for free-camera review
- **POV Request:** Players in a match can request their POV be rendered (capped per match)
- **Visibility Control:** Captains can set match visibility (public/private/default 7-day delay)
- **VOD Archive:** YouTube embeds with timestamps, related VOD recommendations
- **Bracket Support:** Single/double elimination brackets for playoff events

## Riot Assets

Champion splash arts loaded from official Riot Data Dragon CDN:
`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{Name}_0.jpg`

No AI-generated images are used anywhere in the project.
