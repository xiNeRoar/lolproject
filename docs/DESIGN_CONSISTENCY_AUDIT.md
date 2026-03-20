# VCLoL Design Consistency Audit & Unified Standard

## Part 1: Complete Current State Audit

### 1.1 Page Title (h1) Patterns — INCONSISTENT

| Page | Size | Extra Classes | Subtitle? |
|---|---|---|---|
| Home | `text-5xl md:text-6xl` | `tracking-tight mb-6 leading-tight` | Yes (paragraph) |
| Teams | `text-4xl` | `mb-2` | Yes (season info) |
| Players | `text-4xl` | `mb-2` | Yes (paragraph) |
| Events | `text-4xl` | `mb-2` | Yes (paragraph) |
| Vods | `text-4xl` | `mb-2` | Yes (paragraph) |
| About | `text-4xl md:text-5xl` | `mb-8` | Yes (paragraph) |
| Register | `text-4xl` | `mb-3` | Yes (paragraph) |
| Contact | `text-4xl md:text-5xl` | `mb-6` | Yes (paragraph) |
| PlayerProfile | `text-3xl` | — | Yes (metadata inline) |
| TeamProfile | `text-3xl` | — | Yes (tag/rank inline) |
| MatchDetail | `text-2xl` | `mb-3` | Yes (badges) |
| EventDetail | `text-4xl md:text-6xl` | `mb-4` | Yes (date) |
| VodDetail | `text-3xl` | `mb-3` | Yes (badges) |
| Dashboard | `text-2xl` | — | No |

**Findings:**
- Listing pages (Teams/Players/Events/Vods): Consistent `text-4xl mb-2` ✅
- Marketing pages (Home/About/Contact): Use responsive `md:text-5xl` or `md:text-6xl` — acceptable hero treatment
- Detail pages (Profile/Match/Vod): Smaller `text-2xl` to `text-3xl` — acceptable for entity pages
- **Issue**: `mb` spacing varies: mb-2, mb-3, mb-4, mb-6, mb-8 — should unify
- **Issue**: All use `font-display font-bold` ✅ consistent

### 1.2 Section Header (CardTitle) Patterns — NOW MOSTLY CONSISTENT

**Standard pattern (after recent fixes):**
`text-base font-display flex items-center gap-2` + Icon `w-4 h-4 text-primary`

| Page | Has font-display? | Has icon? | Icon has text-primary? |
|---|---|---|---|
| PlayerProfile — Badges | ✅ | ✅ Award | ✅ |
| PlayerProfile — ELO Trajectory | ✅ | ✅ TrendingUp | ✅ |
| PlayerProfile — Champion Pool | ✅ | ✅ Crosshair | ✅ |
| PlayerProfile — Events | ✅ | ✅ CalendarDays | ✅ |
| PlayerProfile — Recent Matches | ✅ | ✅ Swords | ✅ |
| PlayerProfile — VODs | ✅ | ✅ Video | ✅ |
| TeamProfile — ELO History | ✅ | ✅ TrendingUp | ✅ |
| TeamProfile — Current Roster | ✅ | ✅ Users | ❌ MISSING |
| TeamProfile — Past Members | ✅ | ✅ UserMinus | ❌ MISSING (uses text-muted-foreground) |
| TeamProfile — Recent Matches | ✅ | ✅ Swords | ✅ |
| MatchDetail — Player Stats | ✅ | ✅ Users | ✅ |
| MatchDetail — VODs | ✅ | ✅ Video | ✅ |
| MatchDetail — Visibility | ✅ | ✅ Eye/EyeOff | Dynamic (acceptable) |
| VodDetail — Timestamps | ✅ | ✅ Clock | ❌ MISSING |
| VodDetail — Related VODs | ✅ | ✅ Video | ❌ MISSING |
| Dashboard — My Teams | ❌ MISSING | ✅ Users | ✅ |
| Dashboard — Badges | ❌ MISSING | ✅ Award | ✅ |
| Dashboard — Notifications | ❌ MISSING | ✅ Bell | ✅ |
| Dashboard — Settings | ❌ MISSING | ✅ Settings | ✅ |

**Remaining issues to fix:**
1. Dashboard CardTitles missing `font-display`
2. TeamProfile Current Roster icon missing `text-primary`
3. VodDetail icons missing `text-primary`

### 1.3 EventDetail Section Headers (h2) — DIFFERENT PATTERN

EventDetail uses `h2` instead of `CardTitle`:
`text-2xl font-display font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2`
Icons: `w-5 h-5 text-primary`

This is an intentional distinction — EventDetail sections are not in Cards, they're free-standing sections with bottom borders. This is acceptable as a separate pattern for full-width content pages.

About page uses similar h2 pattern with `w-5 h-5 text-primary` icons — consistent with EventDetail.

### 1.4 Card Background/Border Patterns — INCONSISTENT

| Context | Background | Border |
|---|---|---|
| Standard content cards (most pages) | `bg-card/40` | `border-border/40` |
| Auth/form cards (Login, Register) | `bg-card/60` | `border-border/40` |
| Dashboard summary cards | `bg-card/60` | `border-border/40` |
| Home feature cards | `bg-card/50` | `border-border/40` |
| Home VOD items | `bg-card/30` | `border-border/40` |
| Events page cards | `bg-card/40` | `border-border/50` ← INCONSISTENT |
| Contact page cards | `bg-card` (solid) | `border-border/50` ← INCONSISTENT |

**Standard to enforce:**
- Content cards: `bg-card/40 border-border/40`
- Auth/elevated cards: `bg-card/60 border-border/40`
- Subtle/nested items: `bg-card/30 border-border/40`
- Border should ALWAYS be `border-border/40` (not /50)

### 1.5 Empty State Patterns — INCONSISTENT

| Page | Pattern |
|---|---|
| Teams | Icon (Trophy) + text in `border-dashed border-border rounded-lg py-20 text-center` |
| Players | Icon (Users) + text in `border-dashed` container |
| Events | Icon (Calendar) + text in `border-dashed` container |
| Vods | Text only in `border-dashed` container (no icon) ← INCONSISTENT |
| PlayerProfile sections | Simple text: "No matches recorded yet." (no container) |
| TeamProfile sections | Simple text: "No active members." (no container) |
| Dashboard sections | Simple text: "No badges earned yet." (no container) |

**Two valid patterns:**
- **List page empty state**: Icon + text in `border-dashed` container (full page)
- **Section empty state**: Simple text in `px-6 py-8 text-center text-muted-foreground text-sm` (inline)

**Issue**: Vods empty state is missing the icon

### 1.6 Loading State Patterns — MOSTLY CONSISTENT

All public pages use `animate-pulse` with `bg-card` blocks. Shape varies by content type:
- List pages: Multiple `h-16 bg-card rounded-xl` rows
- Detail pages: 2 large blocks (`h-40` + `h-48`)
- Grid pages (Events/Vods): Grid of placeholder cards

**Issue**: EventDetail uses text "Loading event..." instead of pulse blocks ← INCONSISTENT

### 1.7 Container Width Patterns — CONSISTENT

| Page Type | Width |
|---|---|
| Listing pages (Teams, Players, Events, Vods) | `max-w-7xl` |
| Detail pages (PlayerProfile, TeamProfile, MatchDetail, VodDetail) | `max-w-4xl` |
| EventDetail | `max-w-5xl` (wider for sidebar layout) |
| Auth pages (Login) | `max-w-sm` |
| Register | `max-w-2xl` |
| About | `max-w-4xl` |
| Contact | `max-w-3xl` |

This pattern is logical and consistent ✅

### 1.8 Text Color Usage — CONSISTENT

| Purpose | Color Class |
|---|---|
| Headings | `text-foreground` (default) |
| Body/secondary | `text-muted-foreground` |
| Accent/links | `text-primary` |
| Gold/peak values | `text-yellow-400` |
| Rankings/special | `text-purple-400` |
| Win/positive | `text-green-400` |
| Loss/negative | `text-red-400` |
| Links/interactive | `text-blue-400` |

No `-500` variants used ✅

---

## Part 2: Industry Standard Research

### 2.1 Competitive Gaming Platform UI Patterns

**Platforms analyzed:** OP.GG, U.GG, Mobalytics, FACEIT, ESEA, Battlefy, Start.gg

#### Page Titles
- **OP.GG**: No page-level h1 on listing pages. Player name is the only prominent text on profiles.
- **U.GG**: Minimal page titles. Data-first design.
- **FACEIT**: Clean sans-serif titles, no icons on page titles.
- **Battlefy**: Tournament names as h1, no decorative icons.
- **Start.gg**: Event names as h1, minimal decoration.

**Industry consensus: Page titles are plain text. No icons on h1. Icons belong on section headers within content.**

#### Section Headers
- **OP.GG**: Tabs for major sections (Overview, Champions, Matches). Sub-section titles are small, bold, uppercase.
- **Mobalytics**: Card-based sections with small icons before section titles.
- **FACEIT**: Tabs + clean section labels.

**Industry consensus: Small icons (16px / w-4) before section titles within cards is standard. Icons should be subtle, not dominant.**

#### Cards
- **OP.GG**: Flat, borderless cards with subtle background differences.
- **Mobalytics**: Cards with thin borders, consistent padding.
- **FACEIT**: Cards with slight elevation, consistent radius.

**Industry consensus: Consistent card styling throughout. One background level for standard content, one for elevated/interactive content.**

#### Empty States
- **OP.GG**: Simple text: "There are no results."
- **FACEIT**: Icon + message + action button.
- **Start.gg**: Illustration + message.

**Industry consensus: List pages use visual empty state (icon/illustration + text). Inline sections use simple text.**

---

## Part 3: Unified Design Standard

### RULE 1: Page Titles (h1)
```
Listing pages: text-4xl font-display font-bold mb-2
Marketing pages (Home/About/Contact): text-4xl md:text-5xl font-display font-bold mb-6
Detail pages: text-2xl to text-3xl font-display font-bold
NO icons on page titles. Ever.
```

### RULE 2: Section Headers (CardTitle inside Cards)
```
className="text-base font-display flex items-center gap-2"
Icon: w-4 h-4 text-primary (ALWAYS)
Every CardTitle MUST have an icon.
```

### RULE 3: Section Headers (h2 in free-standing sections like EventDetail/About)
```
className="text-2xl font-display font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2"
Icon: w-5 h-5 text-primary
```

### RULE 4: Cards
```
Standard content:    bg-card/40 border-border/40
Auth/elevated:       bg-card/60 border-border/40
Subtle/nested:       bg-card/30 border-border/40
NEVER use border-border/50 on public pages.
```

### RULE 5: Empty States
```
List page (full page empty):
  - Container: border border-dashed border-border rounded-lg py-20 text-center
  - Icon: w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50
  - Title: text-xl font-medium mb-2
  - Description: text-muted-foreground text-sm

Inline section empty:
  - px-6 py-8 text-center text-muted-foreground text-sm
  - No icon, no container
```

### RULE 6: Loading States
```
List page:  5 rows of h-16 bg-card rounded-xl with animate-pulse
Detail page: 2 blocks (h-40 + h-48) bg-card rounded-xl with animate-pulse
Grid page:  Grid of h-48/h-72 bg-card rounded-xl with animate-pulse
NEVER use text "Loading..." on public pages.
```

### RULE 7: Text Colors
```
text-primary           — accent, links, interactive
text-yellow-400        — gold, peak values, captain badge
text-purple-400        — special rankings
text-green-400         — wins, positive
text-red-400           — losses, negative
text-blue-400          — info links
text-muted-foreground  — secondary text
NO -500 variants. Ever.
```

---

## Part 4: Gap Analysis — What Needs Fixing

### Priority fixes (violations of the unified standard):

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | PlayerDashboard.tsx | CardTitles missing `font-display` | Add `font-display` to all 4 CardTitle classNames |
| 2 | TeamProfile.tsx | Current Roster icon missing `text-primary` | Add `text-primary` to Users icon |
| 3 | VodDetail.tsx | Timestamps + Related VODs icons missing `text-primary` | Add `text-primary` to Clock and Video icons |
| 4 | Events.tsx | Card uses `border-border/50` | Change to `border-border/40` |
| 5 | Contact.tsx | Card uses `border-border/50` and `bg-card` solid | Change to `bg-card/40 border-border/40` |
| 6 | Vods.tsx | Empty state missing icon | Add Video icon to empty state |
| 7 | EventDetail.tsx | Loading uses text "Loading event..." | Replace with pulse skeleton blocks |
| 8 | Home.tsx | Feature cards CardTitle missing `font-display` | Already `text-lg` — different pattern (feature showcase), acceptable exception |

### NOT changing (intentional design distinctions):
- Home hero title is `text-5xl md:text-6xl` — intentional marketing page treatment
- Register step headers use numbered circles — intentional onboarding pattern
- EventDetail uses h2 with border-b instead of CardTitle — intentional for free-standing sections
- About uses h2 with icons — intentional for prose sections
- Admin pages follow different card styling — separate design scope
