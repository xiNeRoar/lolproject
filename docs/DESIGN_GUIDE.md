# VCLoL Design Guide

Canonical design system reference for all VCLoL frontend work. Read this before implementing any UI feature.

## Theme Overview

- Dark-only theme (Dark Charcoal and Steel Blue palette)
- No light mode -- never use `dark:` prefixed Tailwind classes
- Single dark palette resolved from CSS custom properties in `artifacts/vclol/src/index.css`
- Tailwind v4 `@theme inline` configuration -- no `tailwind.config` file

## Color Tokens

All colors are HSL triplets defined as CSS custom properties in `:root`, consumed via Tailwind semantic classes.

| Token | HSL Value | Hex | Role |
|-------|-----------|-----|------|
| `--background` | 222 15% 6% | #0E1015 | Page background |
| `--foreground` | 210 20% 98% | #F8FAFC | Primary text |
| `--card` | 222 15% 9% | #151920 | Card/panel background |
| `--card-foreground` | 210 20% 98% | #F8FAFC | Card text |
| `--popover` | 222 15% 9% | #151920 | Popover background |
| `--popover-foreground` | 210 20% 98% | #F8FAFC | Popover text |
| `--primary` | 210 80% 55% | #2B8AEE | Brand accent (Steel Blue) |
| `--primary-foreground` | 0 0% 100% | #FFFFFF | Text on primary |
| `--secondary` | 222 15% 15% | #212838 | Secondary surfaces |
| `--secondary-foreground` | 210 20% 98% | #F8FAFC | Text on secondary |
| `--muted` | 222 15% 12% | #1A1F28 | Muted background |
| `--muted-foreground` | 215 15% 65% | #9BA3B0 | Secondary text |
| `--accent` | 210 80% 55% | #2B8AEE | Same as primary |
| `--accent-foreground` | 0 0% 100% | #FFFFFF | Text on accent |
| `--destructive` | 0 84% 60% | #EF4444 | Error/danger |
| `--destructive-foreground` | 210 40% 98% | #F8FAFC | Text on destructive |
| `--border` | 222 15% 18% | #272D36 | Border color |
| `--input` | 222 15% 15% | #212838 | Input background |
| `--ring` | 210 80% 55% | #2B8AEE | Focus ring |

### Radius Tokens

| Token | Value |
|-------|-------|
| `--radius-sm` | 0.125rem (2px) |
| `--radius-md` | 0.25rem (4px) |
| `--radius-lg` | 0.5rem (8px) |
| `--radius` (base) | 0.25rem (4px) |

Convention: `rounded-lg` (8px) for cards, `rounded-md` (4px) for inputs/buttons.

### Semantic Colors (outside token system)

Used directly via Tailwind utility classes. No CSS custom property defined.

| Color | Tailwind Class | Usage |
|-------|----------------|-------|
| Green | `text-green-400` / `bg-green-400/20` | Win indicators, success |
| Red | `text-red-400` / `bg-red-400/20` | Loss indicators, errors |
| Yellow | `text-yellow-400` / `bg-yellow-400/20` | Gold rank (ELO >= 1400) |
| Purple | `text-purple-400` / `bg-purple-400/20` | Silver rank (ELO >= 1200) |
| Blue | `text-blue-400` / `bg-blue-400/20` | Bronze rank (ELO >= 1100) |

## Typography

| Font | Weights | Role | Tailwind Class |
|------|---------|------|----------------|
| Inter | 400, 500, 600 | Body text, labels, data, navigation | `font-sans` (default) |
| Outfit | 500, 600, 700, 800 | Headings, display text, branding | `font-display` |

**Conventions:**

- `h1`-`h6` get `font-display` + `tracking-tight` automatically via `@layer base` in index.css
- Card titles use `font-display` explicitly via CardTitle component
- Navigation labels: `text-sm font-medium` (Inter)
- Secondary text: always `text-muted-foreground` (never a custom gray)
- Page titles: `text-4xl font-display font-bold`
- Section headings: `text-xl font-semibold font-display`
- Badge text: `text-xs` (Inter)

## Spacing and Radius

No formal spacing scale -- document observed patterns only:

- Page content padding: `pt-16 pb-4` (standard) or `py-24` (hero sections)
- Container max-width: `max-w-7xl` (public pages), unconstrained (admin)
- Container horizontal padding: `px-4 sm:px-6 lg:px-8`
- Card spacing: `space-y-3` for vertical stacks

## Layout Patterns

### PublicLayout

- Sticky header: `backdrop-blur-md`, `bg-background/80`
- Content container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Footer: `border-t border-border/40 bg-card/30`
- Mobile: hamburger menu at `md:` breakpoint
- Navigation: horizontal `space-x-8` links at `md:`+

### AdminLayout

- Fixed sidebar `w-56` on `md:`+, hidden on mobile
- Sidebar section labels: uppercase `text-[10px] tracking-widest`
- Content area: `overflow-y-auto p-8`
- No max-width constraint

### Common Page Patterns

- **Loading:** `animate-pulse` skeleton cards
- **Empty state:** dashed border container with Lucide icon (`w-12 h-12`) + message + CTA link
- **Card grids:** `space-y-3` vertical stacking
- **Hero sections:** full-width with gradient overlay

## Component Usage Principles

55 shadcn/ui components available in `artifacts/vclol/src/components/ui/`. Use the correct component category:

| Component | When to Use |
|-----------|-------------|
| Card | Content display, data panels, list items |
| Dialog | Non-destructive modals (settings, details, forms) |
| AlertDialog | Destructive confirmations (delete, remove, leave team) |
| Sheet | Side panels, mobile navigation |
| Drawer | Bottom-up mobile panels |
| Tabs | Multi-view same-page content |
| Popover | Contextual info on click |
| Tooltip | Contextual info on hover |
| Toast/Sonner | Transient notifications |

**Button variants (6 variants, 4 sizes):**

| Variant | Usage |
|---------|-------|
| `default` | Primary CTA. Shadow + hover lift (`hover:-translate-y-0.5`). |
| `destructive` | Danger actions (delete, remove). |
| `outline` | Secondary actions. Border + bg-background. |
| `secondary` | Tertiary actions. `bg-secondary`. |
| `ghost` | Inline/contextual actions. No background, hover only. |
| `link` | Text link style with underline on hover. |

| Size | Dimensions |
|------|------------|
| `default` | h-10 px-4 py-2 |
| `sm` | h-8 px-3, text-xs |
| `lg` | h-12 px-8, text-base |
| `icon` | h-10 w-10 |

**Utilities:**

- Class merging: always use `cn()` from `@/lib/utils` for conditional classes
- Icons: Lucide React -- `w-4 h-4` for inline, `w-12 h-12` for empty states
- Animation: Framer Motion for page transitions. Pattern: `motion.div` with `initial={{ opacity: 0, y: 20 }}` and `animate={{ opacity: 1, y: 0 }}`
- Charts: Recharts with `hsl(var(--token))` for colors

## Do / Don't Rules

1. **Don't use raw color values.** Always use semantic tokens (`text-foreground`, `bg-card`, `text-muted-foreground`). Never hardcode hex or HSL. Exception: win/loss colors (`green-400`, `red-400`) which lack dedicated tokens.

2. **Don't write custom button styles.** Use the shadcn Button component with the correct variant. All 6 variants cover every use case.

3. **Don't use Alert for confirmations.** Use AlertDialog for destructive confirmations, Dialog for non-destructive. Alert is for inline status messages only.

4. **Don't skip the container pattern.** Public pages use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Never go full-width without the container wrapper.

5. **Don't use custom fonts.** Only Inter (body) and Outfit (display). Headings get `font-display` automatically via base CSS. Never add a third font.

6. **Don't build custom form inputs.** Use shadcn form components (Input, Select, Textarea, Checkbox, Switch, RadioGroup). They already match the theme.

7. **Don't use light mode classes.** The app is dark-only. Never add `dark:` prefixed classes. All tokens resolve to a single dark palette.

## New Pattern Specifications

### Per-Team Career Card

**Purpose:** Show a player's record for one specific team in career history.

**Data source:** Per-team stats endpoint (Phase 5, STAT-01).

**Data shape:**

```typescript
{
  teamId: number;
  teamName: string;
  teamTag: string;
  role: string | null;    // "Top" | "Jungle" | "Mid" | "Bot" | "Support" | null
  status: string;         // "active" | "inactive"
  wins: number;
  losses: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
}
```

**Layout:** Card component, horizontal stack. Team name + tag left-aligned, role Badge if present, W/L record and KDA right-aligned. `text-muted-foreground` for secondary text. Inactive teams get muted treatment.

**Components:** Card, Badge (for role), CardContent.

### Activity Heatmap

**Purpose:** Match frequency over time, GitHub contribution graph style.

**Data source:** Player match history dates (derive client-side from match listing).

**Data shape:** `Record<string, number>` -- ISO date string to match count.

**Layout:** Grid of 52 columns (weeks) x 7 rows (days). Small squares with primary color opacity scale:

- 0 matches: `bg-muted`
- 1 match: `bg-primary/20`
- 2 matches: `bg-primary/40`
- 3 matches: `bg-primary/60`
- 4+ matches: `bg-primary/80` or `bg-primary`

Month labels above, day labels (Mon/Wed/Fri) on left.

**Components:** Pure div grid (no shadcn component needed), Tooltip on hover for date + count.

### Shareable Card

**Purpose:** Compact card view optimized for screenshots. User clicks "Share" button, gets a visually clean card they can screenshot.

**Data source:** Same data as the current page (player profile, team profile, match result).

**Layout:** Fixed-width container (480px), padded, dark background (`--background`), VCLoL branding in corner, key stats prominent, no interactive elements.

**Components:** Card with custom compact layout, rendered as client-side overlay/modal.

**Not in scope:** Server-side PNG rendering, social media meta tags, OG image generation. Deferred to a future phase.

## Bot Embed Alignment

All four bot renderers (`scoreboardRenderer`, `playerCardRenderer`, `teamCardRenderer`, `leaderboardRenderer`) share the same color palette as the website. When adding new web components that have bot equivalents, match the hex values from this table.

| Bot Constant | Hex | Web Token |
|---|---|---|
| `bg` / `background` | #0E1015 | `--background` |
| `card` | #151920 | `--card` |
| `cardL` / `cardLight` | #1C2230 | (no token -- lighter card for alternating rows) |
| `pri` / `primary` | #2B8AEE | `--primary` |
| `fg` / `foreground` | #F8FAFC | `--foreground` |
| `mut` / `muted` | #9BA3B0 | `--muted-foreground` |
| `bdr` / `border` | #272D36 | `--border` |
| `grn` / `green` | #4ADE80 | green-400 |
| `red` | #F87171 | red-400 |
| `blue` | #3B82F6 | blue-500 |
| `redSide` | #EF4444 | red-500 |
| `gold` | #FACC15 | yellow-400 |
| `silver` | #C0C0C0 | (standard silver) |
| `bronze` | #CD7F32 | (standard bronze) |
| `purp` | #A78BFA | violet-400 |
| `blu` | #60A5FA | blue-400 |

**Font alignment:** Bot uses Inter + Outfit (same pairing as web), loaded from font files in `artifacts/discord-bot/src/fonts/`.

**Structural alignment:** 8px card radius, alternating row backgrounds, VCLoL branding footer.

**Principle:** When adding new web components that have bot equivalents, match the hex values from this table. When adding new bot renderers, use hex equivalents of the web token HSL values.

## Canonical Source Reference

| What | Location |
|------|----------|
| Design tokens (source of truth) | `artifacts/vclol/src/index.css` |
| Component library (55 shadcn/ui) | `artifacts/vclol/src/components/ui/` |
| Layout components | `artifacts/vclol/src/components/layout/` |
| Bot renderers | `artifacts/discord-bot/src/lib/*Renderer.ts` |
| Class merge utility | `artifacts/vclol/src/lib/utils.ts` (`cn` function) |
| ELO rank colors | `artifacts/vclol/src/lib/lol-utils.ts` (`eloBadgeColor`) |
