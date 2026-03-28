# Phase 8: Design System & Ownership Docs - Research

**Researched:** 2026-03-28
**Domain:** Design documentation, design token extraction, ownership model documentation
**Confidence:** HIGH

## Summary

Phase 8 is a pure documentation phase with no code changes. The work involves three deliverables: (1) extracting the implicit design system from the live codebase into `docs/DESIGN_GUIDE.md`, (2) updating the CLAUDE.md ownership section to reflect full-stack Claude ownership, and (3) updating PROJECT.md constraints to match the new ownership model.

The codebase already has a well-defined design system -- it is just not documented. All color tokens exist as CSS custom properties in `artifacts/vclol/src/index.css` using Tailwind v4's `@theme inline` configuration. The font pairing (Inter + Outfit) is established. The component library is ~55 shadcn/ui components using the standard CVA + clsx + tailwind-merge pattern. Bot renderers already share the same color palette via hardcoded hex equivalents of the CSS HSL tokens. The research below catalogs every token, pattern, and convention the planner needs to produce tasks.

**Primary recommendation:** Extract tokens directly from `index.css` and bot renderer source files. Document principles and do/don't rules rather than per-component API docs. The design guide is a reference for future Claude sessions implementing frontend, not a component library replacement.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Token reference + principles level. Document color tokens, typography, spacing, radius as reference tables. Add component usage principles (when to use Card vs Dialog, layout grid conventions, dark-only theme). Do NOT write per-component usage examples -- shadcn docs already cover that.
- **D-02:** Include 5-8 do/don't rules as core guardrails. Examples: "Don't use alert for confirmations -- use Dialog", "Don't write custom buttons -- use shadcn Button variants". These help Claude align style and avoid common mistakes when implementing frontend.
- **D-03:** Concept + data contract level for each new pattern. Describe what data each pattern shows, which tokens/components to use, approximate layout, and data source. Do NOT produce wireframes or pixel-level specs.
- **D-04:** Three new patterns to specify: Per-team career card, Activity heatmap, Shareable card (details in CONTEXT.md).
- **D-05:** Add a "Bot Embed Alignment" section to the design guide. Document shared color palette principles, font choices, and consistency rules between bot PNG scoreboards and website. Principles only -- no bot code changes.
- **D-06:** Minimal update to CLAUDE.md -- change ownership section so Claude owns `artifacts/vclol/src/` (was Replit), add reference to DESIGN_GUIDE.md as canonical design source. No other CLAUDE.md restructuring.
- **D-07:** Update PROJECT.md constraints and active requirements to reflect full-stack Claude ownership model.

### Claude's Discretion
- Exact do/don't rule selection (choose the 5-8 most impactful based on codebase analysis)
- Design guide document structure and section ordering
- Level of detail in bot-web alignment principles
- How to phrase ownership transition in PROJECT.md

### Deferred Ideas (OUT OF SCOPE)
- OG image generation for shareable cards -- Requires server-side rendering infrastructure. Own phase.
- Bot renderer visual refresh -- Updating bot embed colors/fonts to match website exactly. Depends on design guide existing first.
- CLAUDE.md full frontend refactor -- Adding frontend build commands, Tailwind v4 conventions. DESIGN_GUIDE.md is the canonical source, CLAUDE.md just references it.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-01 | docs/DESIGN_GUIDE.md created with actual design tokens, typography, component patterns, layout conventions, and new pattern specs (per-team career cards, activity heatmap, shareable cards) | Full token inventory extracted from index.css. Font pairing documented. Component library cataloged (55 components). Layout patterns extracted from PublicLayout and AdminLayout. Bot renderer color mapping documented. New pattern data contracts specified in Architecture Patterns section. |
| DOC-02 | CLAUDE.md updated -- Claude owns artifacts/vclol/src/ (full-stack), design guide referenced as canonical | Current ownership section identified at line 241-247 of CLAUDE.md. Exact text to replace documented. Also update PROJECT.md Constraints section (line 94) and Context section (line 82-83). |
| DOC-03 | PROJECT.md updated -- full-stack ownership model, updated constraints, active requirements reflect frontend scope | Current PROJECT.md Constraints line 94 and Context line 82 still reference "Two AI agents" split. Active requirements lines 56-58 still say "(Replit)". All locations identified for update. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Schema first:** Schema -> OpenAPI -> codegen -> route -> page. Never skip.
- **Ownership boundary (current):** Claude never edits `artifacts/vclol/src/`, Replit never edits backend/bot/docs. This phase CHANGES this boundary.
- **Doc updates in same commit:** When architecture principle changes, update CLAUDE.md itself.
- **GSD workflow:** Use GSD commands for all work.
- **File naming:** kebab-case for source files, schema files use camelCase.
- **No test framework:** None detected in any package.json.

## Architecture Patterns

### Design Guide Document Structure (Recommended)

```
docs/DESIGN_GUIDE.md
  # VCLoL Design Guide
  ## Theme Overview (dark-only, Dark Charcoal & Steel Blue)
  ## Color Tokens (reference table from index.css)
  ## Typography (Inter + Outfit, weight scale)
  ## Spacing & Radius
  ## Layout Patterns (Public vs Admin, container widths)
  ## Component Usage Principles (when to use what)
  ## Do / Don't Rules (5-8 guardrails)
  ## New Pattern Specifications
    ### Per-Team Career Card
    ### Activity Heatmap
    ### Shareable Card
  ## Bot Embed Alignment
  ## Canonical Source Reference
```

### Pattern 1: Color Token System

**What:** All colors are HSL triplets defined as CSS custom properties in `:root`, consumed via Tailwind v4 `@theme inline` semantic aliases.

**Source:** `artifacts/vclol/src/index.css`

**Complete token inventory:**

| Token | HSL Value | Hex Equivalent | Role |
|-------|-----------|----------------|------|
| `--background` | 222 15% 6% | #0E1015 | Page background |
| `--foreground` | 210 20% 98% | #F8FAFC | Primary text |
| `--card` | 222 15% 9% | #151920 | Card / panel background |
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
| `--destructive` | 0 84% 60% | #EF4444 | Error / danger |
| `--destructive-foreground` | 210 40% 98% | #F8FAFC | Text on destructive |
| `--border` | 222 15% 18% | #272D36 | Border color |
| `--input` | 222 15% 15% | #212838 | Input background |
| `--ring` | 210 80% 55% | #2B8AEE | Focus ring (same as primary) |

**Radius tokens:**

| Token | Value |
|-------|-------|
| `--radius-sm` | 0.125rem (2px) |
| `--radius-md` | 0.25rem (4px) |
| `--radius-lg` | 0.5rem (8px) |
| `--radius` (base) | 0.25rem (4px) |

**Additional semantic colors used in components (not in token system):**

| Color | Tailwind Class | Usage |
|-------|----------------|-------|
| Green | `text-green-400`, `bg-green-400/20` | Win indicators, success |
| Red | `text-red-400`, `bg-red-400/20` | Loss indicators, errors |
| Yellow | `text-yellow-400`, `bg-yellow-400/20` | Gold rank (ELO >= 1400) |
| Purple | `text-purple-400`, `bg-purple-400/20` | Silver rank (ELO >= 1200) |
| Blue | `text-blue-400`, `bg-blue-400/20` | Bronze rank (ELO >= 1100) |

### Pattern 2: Typography System

**What:** Dual font pairing with distinct roles.

| Font | Weights | Role | Tailwind Class |
|------|---------|------|----------------|
| Inter | 400, 500, 600 | Body text, labels, data, navigation | `font-sans` (default) |
| Outfit | 500, 600, 700, 800 | Headings, display text, branding | `font-display` |

**Conventions observed in codebase:**
- `h1`-`h6` automatically get `font-display` via the `@layer base` rule in index.css
- `tracking-tight` applied to all headings globally
- Card titles use `font-display` explicitly via CardTitle component
- Navigation labels use `text-sm font-medium` (Inter)
- Muted/secondary text uses `text-muted-foreground` (never a custom gray)
- Page titles: `text-4xl font-display font-bold`
- Section headings: `text-xl font-semibold font-display`
- Badge text: `text-xs` (Inter)

### Pattern 3: Layout System

**Two layout paradigms:**

**Public Layout** (`PublicLayout.tsx`):
- Sticky header with `backdrop-blur-md`, `bg-background/80`
- Content container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Page content padding: `pt-16 pb-4` (typical) or `py-24` (hero sections)
- Footer with `border-t border-border/40 bg-card/30`
- Mobile: hamburger menu at `md:` breakpoint
- Navigation: horizontal `space-x-8` links at `md:+`

**Admin Layout** (`AdminLayout.tsx`):
- Fixed sidebar `w-56` on `md:+`, hidden on mobile
- Sidebar sections with uppercase `text-[10px] tracking-widest` labels
- Content area: `overflow-y-auto p-8`
- No max-width constraint on admin content

**Common page patterns:**
- Loading state: `animate-pulse` skeleton cards
- Empty state: dashed border container with icon + message + CTA link
- Card grids: `space-y-3` vertical stacking (not CSS grid)
- Hero sections: full-width with gradient overlay on background image

### Pattern 4: Component Usage Conventions

**Component library:** 55 shadcn/ui components in `artifacts/vclol/src/components/ui/`

Full list: accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button-group, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, empty, field, form, hover-card, input-group, input-otp, input, item, kbd, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, spinner, switch, table, tabs, textarea, toast, toaster, toggle-group, toggle, tooltip

**Additional non-UI components:**
- 5 bracket components in `components/brackets/`: SingleEliminationBracket, DoubleEliminationBracket, RoundRobinTable, SwissRoundsTable, MatchList
- 2 layout components: PublicLayout, AdminLayout
- GlobalSearch (in layout directory)

**Utility pattern:** `cn()` from `@/lib/utils` -- always use for conditional classes. Pattern: `cn("base classes", condition && "conditional", className)`.

**Icon library:** Lucide React (`lucide-react`). All icons are `w-4 h-4` by default in navigation, `w-12 h-12` for empty states.

**Animation:** Framer Motion used on Home page hero. Pattern: `motion.div` with `initial={{ opacity: 0, y: 20 }}` and `animate={{ opacity: 1, y: 0 }}`.

**Charts:** Recharts (`ResponsiveContainer` + `LineChart`). Used in PlayerProfile for ELO trajectory. Chart styling uses `hsl(var(--token))` for colors.

### Pattern 5: Button Variants

The Button component defines 6 variants and 4 sizes:

| Variant | Usage |
|---------|-------|
| `default` | Primary CTA. Has shadow + hover lift effect (`hover:-translate-y-0.5`). |
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

### Anti-Patterns to Avoid

Based on codebase analysis, these are the most impactful do/don't rules (Claude's discretion, choosing 7):

1. **Don't use raw color values.** Always use semantic tokens (`text-foreground`, `bg-card`, `text-muted-foreground`). Never hardcode hex or HSL. Exception: win/loss semantic colors (`green-400`, `red-400`) which lack dedicated tokens.

2. **Don't write custom button styles.** Use the shadcn Button component with the correct variant. All 6 variants cover every use case in the app.

3. **Don't use Alert for confirmations.** Use AlertDialog for destructive confirmations, Dialog for non-destructive. Alert is for inline status messages only.

4. **Don't skip the container pattern.** Public pages use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Never go full-width without the container wrapper.

5. **Don't use custom fonts.** Only Inter (body) and Outfit (display). Headings get `font-display` automatically via base CSS. Never add a third font.

6. **Don't build custom form inputs.** Use the shadcn form components (Input, Select, Textarea, Checkbox, Switch, RadioGroup). They already match the theme.

7. **Don't use light mode classes.** The app is dark-only. Never add `dark:` prefixed classes. Never reference `light` theme. All tokens resolve to a single dark palette.

## Bot-Web Color Alignment

All four bot renderers use the same color palette, hardcoded as hex equivalents of the web CSS tokens:

| Bot Constant | Hex | Web Token Equivalent |
|--------------|-----|---------------------|
| `bg` / `background` | #0E1015 | `--background` (222 15% 6%) |
| `card` | #151920 | `--card` (222 15% 9%) |
| `cardL` / `cardLight` | #1C2230 | (no token -- slightly lighter card for alternating rows) |
| `pri` / `primary` | #2B8AEE | `--primary` (210 80% 55%) |
| `fg` / `foreground` | #F8FAFC | `--foreground` (210 20% 98%) |
| `mut` / `muted` | #9BA3B0 | `--muted-foreground` (215 15% 65%) |
| `bdr` / `border` | #272D36 | `--border` (222 15% 18%) |
| `grn` / `green` | #4ADE80 | Tailwind green-400 |
| `red` | #F87171 | Tailwind red-400 |
| `blue` | #3B82F6 | Tailwind blue-500 |
| `redSide` | #EF4444 | Tailwind red-500 |
| `gold` | #FACC15 | Tailwind yellow-400 |
| `silver` | #C0C0C0 | (standard silver) |
| `bronze` | #CD7F32 | (standard bronze) |
| `purp` | #A78BFA | Tailwind violet-400 |
| `blu` | #60A5FA | Tailwind blue-400 |

**Font alignment:**
- Bot uses Inter (Regular, SemiBold) + Outfit (Bold, SemiBold) -- same pairing as web
- Font files shipped in `artifacts/discord-bot/src/fonts/` directory
- Bot registers fonts via `@napi-rs/canvas` GlobalFonts API

**Structural alignment:**
- Rounded corners (8px card radius) in both bot and web
- Alternating row backgrounds in both bot tables and web tables
- `VCLoL` branding in both bot footer and web header/footer

## New Pattern Data Contracts

### Per-Team Career Card

**Purpose:** Show a player's record for one specific team in their career history.

**Data source:** Per-team stats endpoint (Phase 5, STAT-01). Returns per-team W/L record and KDA averages grouped by team membership.

**Data shape:**
```typescript
{
  teamId: number;
  teamName: string;
  teamTag: string;
  role: string | null;       // "Top" | "Jungle" | "Mid" | "Bot" | "Support" | null
  status: string;            // "active" | "inactive"
  wins: number;
  losses: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
}
```

**Layout:** Card component. Horizontal stack. Team name + tag left-aligned, role badge if present, W/L record and KDA averages right-aligned. Use `text-muted-foreground` for secondary text (role, KDA labels). Active teams get normal foreground; inactive teams use muted treatment.

**Components:** Card, Badge (for role), possibly CardContent only (no header needed if compact).

### Activity Heatmap

**Purpose:** Match frequency over time, GitHub contribution graph style.

**Data source:** Player match history dates. Derived from existing match listing endpoints -- extract `createdAt` dates and count matches per day.

**Data shape:**
```typescript
// Derived client-side from match history
Record<string, number>  // ISO date string -> match count for that day
```

**Layout:** Grid of 52 columns (weeks) x 7 rows (days). Each cell is a small square. Primary color with opacity scale for intensity:
- 0 matches: `bg-muted` (or transparent)
- 1 match: `bg-primary/20`
- 2 matches: `bg-primary/40`
- 3 matches: `bg-primary/60`
- 4+ matches: `bg-primary/80` or `bg-primary`

Month labels above. Day labels (Mon/Wed/Fri) on left.

**Components:** No shadcn component needed -- pure div grid. Tooltip on hover showing date + count.

### Shareable Card

**Purpose:** Compact card view optimized for screenshots. User clicks "Share" button, gets a visually clean card they can screenshot.

**Data source:** Same data as the page the user is viewing (player profile, team profile, match result).

**Layout:** Fixed-width container (e.g., 480px) with padding. Dark background matching `--background`. VCLoL branding in corner. Key stats displayed prominently. No interactive elements -- pure display.

**Components:** Card with custom compact layout. No server-side rendering -- this is a client-side overlay/modal that renders a screenshot-optimized view.

**Not in scope:** OG image generation, social media meta tags, server-side PNG rendering. Those are deferred to a future phase.

## Ownership Update Locations

### CLAUDE.md Changes (DOC-02)

**Current text (lines 241-247):**
```
## Ownership

**Claude owns (Replit never edits):**
`lib/db/src/schema/` . `lib/api-spec/openapi.yaml` . `artifacts/api-server/` . `artifacts/discord-bot/` . `docs/` (except replit.md) . `CLAUDE.md`

**Replit owns (Claude never edits):**
`artifacts/vclol/src/` . `replit.md`
```

**New text:**
```
## Ownership

**Claude owns:**
`lib/db/src/schema/` . `lib/api-spec/openapi.yaml` . `artifacts/api-server/` . `artifacts/discord-bot/` . `artifacts/vclol/src/` . `docs/` . `CLAUDE.md`

Design guide: `docs/DESIGN_GUIDE.md` is the canonical design reference for all frontend work.
```

Also update the Constraints section (around line 93-94) which says:
```
- **Ownership Boundary:** Claude never edits `artifacts/vclol/src/`, Replit never edits backend/bot/docs
```
Change to reflect full-stack Claude ownership.

### PROJECT.md Changes (DOC-03)

**Locations to update:**

1. **Context section (line 82-83):** "Two AI agents: Claude owns backend/bot/docs, Replit owns frontend" -> Single AI agent: Claude owns full stack
2. **Constraints section (line 94):** "Ownership Boundary: Claude never edits `artifacts/vclol/src/`" -> Remove or update to reflect full-stack ownership
3. **Active requirements (lines 56-58):** Three items marked "(Replit)" -> Remove "(Replit)" attribution or clarify Claude ownership
4. **Key Decisions table:** Consider adding an ownership transition decision row

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Design token documentation | Custom format | Extract directly from index.css | Tokens are already defined; just catalog them as-is |
| Component API docs | Per-component usage guide | Reference shadcn/ui official docs | shadcn docs are authoritative; duplicating wastes effort and drifts |
| Color conversion (HSL to hex) | Manual calculation | Bot renderers already have hex equivalents | All four renderers hardcode the hex; just read them |
| Activity heatmap library | Custom grid system | Pure CSS grid with Tailwind | GitHub-style grids are trivial in CSS grid; no library needed |

## Common Pitfalls

### Pitfall 1: Documenting Component APIs Instead of Principles
**What goes wrong:** The design guide becomes a copy of shadcn/ui docs, 500+ lines per component, immediately stale.
**Why it happens:** Temptation to be "complete" leads to documenting props, variants, and examples for every component.
**How to avoid:** D-01 explicitly says no per-component usage examples. Document WHEN to use each component category (Card vs Dialog vs Sheet), not HOW.
**Warning signs:** Guide exceeds 300 lines. Component sections have code examples showing `<Button variant="default">`.

### Pitfall 2: Inventing Tokens That Don't Exist
**What goes wrong:** The guide includes spacing scales, z-index hierarchies, or animation curves that aren't actually defined in the codebase.
**Why it happens:** Desire for a "complete" design system document.
**How to avoid:** Only document what is actually in index.css and observed in component usage. If the codebase uses ad-hoc spacing, document the patterns observed (e.g., "pages use pt-16 pb-4") rather than inventing a formal scale.
**Warning signs:** Guide references tokens not in index.css. Guide defines a spacing scale the components don't use.

### Pitfall 3: Ownership Update Scope Creep
**What goes wrong:** The CLAUDE.md update turns into a full restructuring -- adding frontend build commands, Tailwind v4 conventions, component patterns.
**Why it happens:** Since Claude now owns frontend, temptation to add all frontend knowledge to CLAUDE.md.
**How to avoid:** D-06 explicitly says minimal update. DESIGN_GUIDE.md is the canonical frontend reference. CLAUDE.md just changes the ownership line and adds a reference.
**Warning signs:** CLAUDE.md diff exceeds 20 lines. New sections added beyond ownership.

### Pitfall 4: Forgetting Bot Renderer Hex Mapping
**What goes wrong:** The design guide documents web tokens but doesn't map them to bot renderer constants, breaking the alignment story.
**Why it happens:** Bot renderers use shorthand variable names (`C.bg`, `C.pri`) that aren't obvious mappings.
**How to avoid:** Include the full bot-web mapping table. All four renderers share the same palette object; document it once.
**Warning signs:** Bot embed alignment section says "use the same colors" without showing the actual hex-to-token mapping.

### Pitfall 5: Shareable Card Over-Specification
**What goes wrong:** The shareable card spec includes server-side rendering, OG meta tags, or social sharing API integration.
**Why it happens:** "Share" naturally implies social media sharing.
**How to avoid:** D-04 says "in-website share button that renders a compact view for user screenshots." No server-side rendering. OG image generation is explicitly deferred.
**Warning signs:** Spec mentions `@napi-rs/canvas`, `og:image`, or `next-seo`.

## Code Examples

### Token Usage in Components (Observed Pattern)

```tsx
// Source: artifacts/vclol/src/pages/public/Teams.tsx
// Card with conditional left border accent
<Card className={cn(
  "bg-card/40 border-border/40 hover:bg-card/70 hover:border-primary/30 transition-all cursor-pointer",
  idx < playoffSize ? "border-l-2 border-l-primary/30" : ""
)}>
```

### Page Structure Pattern

```tsx
// Source: artifacts/vclol/src/pages/public/Teams.tsx
// Standard public page structure
<PublicLayout>
  <div className="max-w-7xl mx-auto px-4 pt-16 pb-4 sm:px-6 lg:px-8">
    <h1 className="text-4xl font-display font-bold mb-2">Page Title</h1>
    <p className="text-muted-foreground">Subtitle text</p>
  </div>
  <div className="max-w-7xl mx-auto px-4 pb-10 sm:px-6 lg:px-8">
    {/* Content */}
  </div>
</PublicLayout>
```

### Empty State Pattern

```tsx
// Source: artifacts/vclol/src/pages/public/Teams.tsx
<div className="text-center py-20 border border-dashed border-border rounded-lg">
  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
  <p className="text-muted-foreground mb-4">Message here.</p>
  <Link href="/register" className="text-sm text-primary hover:underline">CTA text</Link>
</div>
```

### Bot Renderer Color Pattern

```typescript
// Source: artifacts/discord-bot/src/lib/scoreboardRenderer.ts
// Colors defined as hex equivalents of web CSS tokens
const COLORS = {
  background: "#0E1015",    // hsl(222 15% 6%)
  card: "#151920",          // hsl(222 15% 9%)
  primary: "#2B8AEE",       // hsl(210 80% 55%)
  foreground: "#F8FAFC",    // hsl(210 20% 98%)
  muted: "#9BA3B0",         // hsl(215 15% 65%)
  border: "#272D36",        // hsl(222 15% 18%)
  green: "#4ADE80",         // win indicator
  red: "#F87171",           // loss indicator
};
```

### ELO Badge Color Tiers

```typescript
// Source: artifacts/vclol/src/lib/lol-utils.ts
// Rank color tiers used in web
export function eloBadgeColor(elo: number) {
  if (elo >= 1400) return "bg-yellow-400/20 text-yellow-400 border-yellow-400/30";  // Gold
  if (elo >= 1200) return "bg-purple-400/20 text-purple-400 border-purple-400/30";  // Silver
  if (elo >= 1100) return "bg-blue-400/20 text-blue-400 border-blue-400/30";        // Bronze
  return "bg-muted text-muted-foreground";                                           // Unranked
}
```

## Sources

### Primary (HIGH confidence)
- `artifacts/vclol/src/index.css` -- All CSS custom properties, font imports, theme configuration
- `artifacts/vclol/src/components/ui/*.tsx` -- 55 shadcn/ui component files, variant definitions
- `artifacts/vclol/src/components/layout/PublicLayout.tsx` -- Public layout structure, header, footer, nav
- `artifacts/vclol/src/components/layout/AdminLayout.tsx` -- Admin layout structure, sidebar
- `artifacts/discord-bot/src/lib/scoreboardRenderer.ts` -- Bot color palette (COLORS object with hex + HSL comments)
- `artifacts/discord-bot/src/lib/playerCardRenderer.ts` -- Bot compact color palette (C object)
- `artifacts/discord-bot/src/lib/teamCardRenderer.ts` -- Bot color palette with rank colors
- `artifacts/discord-bot/src/lib/leaderboardRenderer.ts` -- Bot color palette with medal colors
- `artifacts/vclol/src/lib/lol-utils.ts` -- ELO badge colors, rank thresholds
- `artifacts/vclol/src/lib/utils.ts` -- cn() utility definition
- `CLAUDE.md` lines 241-247 -- Current ownership section
- `.planning/PROJECT.md` lines 82-94 -- Current context and constraints

### Secondary (MEDIUM confidence)
- `artifacts/vclol/src/pages/public/Home.tsx` -- Hero section patterns, animation usage
- `artifacts/vclol/src/pages/public/Teams.tsx` -- Card list patterns, empty states
- `artifacts/vclol/src/pages/public/PlayerProfile.tsx` -- Chart integration, data display patterns

## Metadata

**Confidence breakdown:**
- Design tokens: HIGH -- extracted directly from source files, no ambiguity
- Typography: HIGH -- font imports and base CSS rules are explicit
- Layout patterns: HIGH -- read directly from layout components
- Bot-web alignment: HIGH -- hex values are hardcoded in renderer source with HSL comments
- New pattern specs: MEDIUM -- data contracts depend on Phase 5 endpoint not yet implemented, but data shape is specified in CONTEXT.md D-04
- Ownership update locations: HIGH -- exact line numbers identified in both files

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable -- documentation of existing codebase, unlikely to change)
