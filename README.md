# Vancouver Competitive LoL Project (VCLoL)

A community-focused competitive gaming hub for Vancouver / Lower Mainland League of Legends players.

## Stack

- **Frontend:** React + Vite (SPA)
- **Routing:** Wouter
- **UI:** Shadcn UI + Tailwind CSS v4
- **Animations:** Framer Motion
- **Backend:** Express.js (REST API)
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** Express session (scrypt password hashing)
- **Package Manager:** pnpm (monorepo)
- **Fonts:** Outfit (display) + Inter (body)

## Public Pages

| Route | Page |
|-------|------|
| `/` | Home — hero, stats bar, feature blocks, upcoming events, recent VODs, Discord CTA |
| `/about` | About the project |
| `/interest` | General interest submission form |
| `/events` | Event listing with champion splash banners |
| `/events/:slug` | Event detail + registration form |
| `/results` | Match results with search, event, and format filters |
| `/vods` | VOD archive with search, event, format, and role tag filters |
| `/contact` | Contact information |

## Admin Pages (protected — single admin account)

| Route | Page |
|-------|------|
| `/admin/login` | Admin login |
| `/admin` | Dashboard — counts + recent items |
| `/admin/interests` | View + delete interest submissions |
| `/admin/events` | CRUD for events |
| `/admin/registrations` | View + delete event registrations |
| `/admin/matches` | CRUD for match results |
| `/admin/vods` | CRUD for VOD entries |

**Admin credentials:** `admin@vclol.gg` / `admin123`

## Development Setup

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm --filter @workspace/db run push

# Seed the database
pnpm --filter @workspace/scripts run seed

# Start the frontend
pnpm --filter @workspace/vclol run dev

# Start the API server (separate terminal)
pnpm --filter @workspace/api-server run dev
```

## Project Structure

```
artifacts/
  vclol/          # React + Vite frontend (SPA)
    src/
      pages/
        public/   # Home, Events, Results, VODs, About, Contact, Interest
        admin/    # Dashboard, CRUD pages, Login
      components/
        layout/   # PublicLayout, AdminLayout, Nav, Footer
        ui/       # Shadcn components
  api-server/     # Express.js REST API
    src/
      routes/     # API route handlers
lib/
  db/             # Drizzle ORM schema + client
  api-spec/       # OpenAPI spec + generated React Query hooks
  api-zod/        # Generated Zod schemas from OpenAPI
```

## Riot Assets

Champion splash arts are loaded directly from the official Riot Data Dragon CDN:
`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{Name}_0.jpg`

No AI-generated images are used anywhere in the project.

## Extending the Project

- **Add a new event:** Admin → Events → New Event
- **Record a match:** Admin → Match Results → New Match
- **Add a VOD:** Admin → VOD Archive → New VOD
- **View interest submissions:** Admin → Interests
- **View registrations:** Admin → Registrations
- **Change admin password:** Update `passwordHash` in `admin_users` table via the seed script
