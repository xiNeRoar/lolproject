# Vancouver Competitive LoL Project (VCLoL)

A full-stack competitive gaming hub for Vancouver / Lower Mainland League of Legends players.

## Stack

- **Framework:** Next.js 15 (App Router, Server Components, Server Actions)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** iron-session (scrypt password hashing)
- **Package Manager:** pnpm (monorepo)

## Public Pages

| Route | Page |
|-------|------|
| `/` | Home — hero, feature blocks, latest event, recent VODs |
| `/about` | About the project |
| `/interest` | General interest submission form |
| `/events` | Event listing |
| `/events/[slug]` | Event detail + registration form |
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

# Run database migrations
pnpm --filter @workspace/db run migrate

# Seed the database
pnpm --filter @workspace/scripts run seed

# Start the development server
pnpm --filter @workspace/vclol run dev
```

The app runs on the port specified by the `PORT` environment variable.

## Project Structure

```
artifacts/vclol/
  app/
    (public)/         # Public-facing pages (Nav + Footer layout)
    admin/
      login/          # Login page (no auth wrapper)
      (protected)/    # Admin pages (auth-checked + sidebar layout)
    api/              # API routes (logout endpoint)
  components/
    Nav.tsx           # Public navigation (client component)
    Footer.tsx        # Public footer
    admin/
      AdminSidebar.tsx
  lib/
    session.ts        # iron-session config, requireAdmin, verifyPassword
    utils.ts          # cn, formatDate, slugify, formatDateTime
lib/db/               # Shared Drizzle DB + schema
```

## Extending the Project

- **Add a new event:** Admin → Events → New Event
- **Record a match:** Admin → Match Results → New Match
- **Add a VOD:** Admin → VOD Archive → New VOD
- **View interest submissions:** Admin → Interests
- **View registrations:** Admin → Registrations
- **Change admin password:** Update `passwordHash` in `admin_users` table using the `hashPassword` function in `scripts/src/seed.ts`
