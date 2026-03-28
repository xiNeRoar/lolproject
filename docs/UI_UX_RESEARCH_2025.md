# UI/UX Design Research 2024-2025

Research compiled for VCLoL frontend design decisions. Covers data-dense dashboards, gaming stats platforms, career/profile design, modern web patterns, navigation, mobile, and onboarding.

---

## 1. Data-Heavy Dashboard Design Trends

### 1.1 How Leading Dashboards Present Complex Data

**Linear** (Issue Tracking)
- Performance-first philosophy: navigation feels nearly instantaneous; speed itself is a UX feature
- Dark UI tones with sharp typography convey control and clarity
- Minimal visual ornamentation; pure information architecture
- Keyboard shortcuts and filtered views optimize for intent-driven workflows
- 2025 change: significantly cut back on color, moving from monochrome blue to monochrome black/white with even fewer accent colors
- One direction for eyes to scan, single subject matter to focus on, orderly sequence of sections

**Stripe** (Financial Dashboard)
- Crisp typography, generous whitespace, and subtle color usage reduce density perception
- Key metrics positioned front-and-center; secondary actions tucked away but accessible
- Combines numbers with context: not just "$2,100 received" but also breakdown of sources and trends
- Left-hand navigation paired with top-level widgets surfaces critical info quickly
- Data-heavy interfaces do not overwhelm when visual hierarchy, clean UI, and functionality align

**Vercel** (Developer Dashboard)
- Collapsible sidebar that streamlines navigation; any tab can be used in full screen
- Designed for users who "live in terminal and GitHub, not in UI tours"
- Prioritizes speed over sparkle; rejects decorative elements that slow productivity
- Developer-centric: deep understanding of how users work, think, and make decisions

**PostHog** (Product Analytics)
- Dense UI reflecting engineering-first approach
- Modular dashboard system: each dashboard targets specific data sources
- Fully customizable: move and resize insight cards in edit mode
- Any combination of trends, funnels, retention charts, and user lists per dashboard
- Each widget independently configurable for different stakeholder views (exec vs. engineer vs. CS)

**Notion** (Workspace)
- Modular, user-configurable approach enables team-specific dashboards
- Inline databases with sortable tables and contextual filters
- Intentional whitespace gives visual breathing room
- Text and structured data coexist (summaries alongside metrics)
- Users design their own information flow rather than accepting rigid layouts

### 1.2 Information Density vs. Whitespace (Current Best Practice)

The 2025 consensus is that density and whitespace are not opposites but complementary tools:

- **Cognitive overload** occurs when too much information is presented at once. Use clean layout with grouped content, section headings, and tabs
- **Whitespace defines zones** and improves scanability. It refers to strategic spacing between data elements and charts to create visual lightness
- **Limit to 5-7 key metrics** visible at any time on a dashboard view. Secondary metrics should be accessible via drill-down
- **Pair every key metric with a simple chart** showing this week, last week, and trailing highs/lows. Anyone can instantly see if something is good, bad, or in line with expectations
- **Use role-based views**: a captain needs different data than a player, an admin needs different data than a visitor

**Actionable for VCLoL:**
- Team profile page: show W/L record, recent form (last 5), and roster at a glance. Detailed match history is one click away
- Match detail page: summary card (teams, score, duration) at top; 10-player stats table below for logged-in participants
- Admin dashboard: key metrics (active teams, matches this week, pending registrations) as top-level cards; detailed tables behind tabs

### 1.3 Progressive Disclosure (Summary -> Click for Detail)

Progressive disclosure reduces cognitive load by gradually revealing information as needed. The pattern is now standard in every well-designed dashboard.

**Implementation Patterns:**
1. **Accordion/Expandable Rows**: Click a match row to expand and show full player stats inline
2. **Card -> Detail Page**: Match cards in a list; click through to full match detail with timeline and 10-player breakdown
3. **Hover Tooltips**: Hover over a KDA to see exact K/D/A breakdown. Hover over a champion icon to see build items
4. **Tabs for Context**: Team profile with tabs for Overview / Matches / Roster / Stats
5. **Dropdown Panels**: Filter controls hidden behind a "Filters" button, expanding to show date range, match type, etc.

**Best Practices:**
- Maintain consistency: use uniform disclosure techniques throughout so users know what to expect
- Limit to single secondary layer per disclosure point; multiple layers confuse users
- Default to the most commonly needed view; make the less common view one interaction away
- Google Flights pattern: prioritize key info (flight times, duration, price) with dropdown for additional details

**Actionable for VCLoL:**
- Match list: compact cards showing teams, score, date, match type. Click/tap to expand or navigate to detail
- Player profile: summary stats (total games, W/L, avg KDA) at top. Per-team breakdown is one tab switch away
- Team profile: roster shown as compact avatar row. Click a player to see their contribution stats for this team

### 1.4 Bento Grid Layouts -- When They Work

Bento grids (modular tiles of varying sizes, like a Japanese bento box) are now used by 67% of the top 100 SaaS websites on ProductHunt. Sites using them report:
- 47% increase in dwell time
- 38% increase in click-through rates
- Better information retention

**When Bento Grids Work:**
- Showcasing diverse content types (stats, charts, roster, recent matches) in one view
- Dashboard landing pages where multiple data types need equal attention
- Portfolio/profile pages where visual hierarchy guides the eye naturally
- When you need asymmetric but balanced compositions (hero stat tile larger than secondary metrics)

**When Bento Grids Do NOT Work:**
- Sequential content (tutorial flows, checkout processes, onboarding wizards)
- Heavily text-based content that needs linear reading order
- Tables with comparison data (use actual tables instead)
- When content requires strict ordering (match timeline, chronological history)

**Actionable for VCLoL:**
- **Home page**: bento grid with hero tile (featured match/event), recent matches tile, top teams tile, quick stats tile
- **Team profile**: bento grid for Overview tab with W/L record (large tile), roster (medium tile), recent form sparkline (small tile), next event (small tile)
- **Match list page**: do NOT use bento; use a vertical list of match cards for scannable chronological order
- **Admin dashboard**: bento grid for KPI overview; traditional tables for data management views

---

## 2. Profile/Portfolio/Resume Platform Design

### 2.1 How Platforms Present Career Narratives

**LinkedIn** (Professional Network)
- Reverse chronological layout (most recent first)
- Section-based organization: headline, experience, skills, activity
- Candidates with comprehensive profiles have 71% higher chance of interview
- Authentic storytelling performs better than manufactured narratives
- Profiles showcasing genuine professional journeys get 34% more recruiter contact

**Read.cv** (Designer Portfolios)
- Beautifully crafted, minimal profiles focused on work quality over quantity
- Clean typographic hierarchy with generous whitespace
- Projects shown as curated case studies rather than exhaustive lists
- Emphasis on visual proof (screenshots, prototypes) alongside narrative

**Polywork** (Multi-faceted Professionals)
- "Wall" of varied update posts rather than rigid resume format
- Tells a broader story than standard resume
- Combines project highlights, roles, freelance work in one unified view
- Personal site builder integrated into profile

### 2.2 Career Timeline Visualizations

The timeline pattern remains dominant for career/experience display:

- **Reverse chronological** (newest first) is universally preferred for mid-to-senior professionals
- **Timeline resumes** present career history in straightforward, organized manner
- Modern timelines use interactive features: hover for details, click to expand
- Visual markers (dots, lines, badges) at each career milestone create scannable overview
- Date labels on left, role/content on right (or vice versa) is the standard two-column approach

**Actionable for VCLoL (Player Career Resume):**
- Show teams in reverse chronological order (most recent team first)
- Each team entry: team name + logo, role (starter/sub), date range, W/L record, avg KDA
- Visual timeline line connecting team entries creates "career journey" effect
- Expandable: click a team entry to see that player's matches with that team
- Active team highlighted differently from past teams (e.g., colored border vs. muted)

### 2.3 Per-Project (Per-Team) Breakdowns

Modern portfolio sites show per-project stats through:
- **Card-based project entries** with key metrics visible (duration, role, outcome)
- **Drill-down pattern**: project card -> project detail page with full context
- **Comparison view**: ability to compare metrics across projects/periods
- **Visual consistency**: same metric layout across all projects for easy scanning

**Actionable for VCLoL (Per-Team Player Stats):**
- Each team a player has been on gets its own card with: team logo, name, dates, W/L, KDA
- Consistent metric placement across all team cards (always same order: games, wins, losses, KDA)
- Click a team card to see match-by-match breakdown for that player on that team
- Sparkline or mini chart showing performance trend during tenure with that team

### 2.4 Privacy States (Private vs. Public Profiles)

Modern platforms handle privacy through:
- **Default private** with clear opt-in flow to go public (VCLoL already does this)
- **Granular controls** with toggle switches for each visibility level
- **Preview mode**: "See what others see" button showing the public view
- **Visual indicators**: badge/icon showing current privacy state on profile (lock icon = private)
- **Just-in-time consent**: explain what becomes visible at each privacy level before confirming
- **Defaults OFF for non-essential sharing**: minimize steps to reject (2 steps max)
- **Centralized privacy dashboard**: single page to review and manage all privacy settings

**Actionable for VCLoL:**
- Player settings page with clear toggle: "Public Profile" ON/OFF
- Preview button: "See what visitors see" loads the public view
- Visual indicator on profile: small lock or eye icon showing private/public/participants-only
- Match visibility: captain sees toggle per match with clear explanation of what each level means
- RSO opt-in flow: explain exactly what becomes public before the user confirms

---

## 3. Competitive Gaming/Esports Platform Design

### 3.1 What Leading Platforms Do (2024-2025)

**OP.GG**
- Refactored app (Oct 2024): faster, cleaner, supports LoL + VALORANT in one app
- Match Detail: analysis with data from every game, various badges, one-line performance summaries
- Performance beyond KDA: badges reward different aspects of play
- Customizable Home: My Summoner, Favorites, 1 Tier Champions, Patch Notes, daily TMIs
- Color system: muted base with performance-coded highlights (blue/red for win/loss)

**Mobalytics**
- Acquired by ESL FACEIT Group (March 2025) for enhanced esports analytics
- Gamer Performance Index (GPI): tracks in-game stats and advises on improvement
- Personalized recommendations based on skill level and playstyle
- Supports LoL, Marvel Rivals, Destiny 2; 10M+ players across 182 countries
- Analyzes matches to identify strengths and weaknesses with targeted advice

**Tracker.gg**
- New UI design rolled out across titles in 2024-2025
- Stats, global and regional leaderboards, badges system
- Developer API for consistent data feeds
- XP, Challenges, and Awards system for engagement

**FACEIT**
- Competitive matchmaking platform with its own ranking system
- Clean match history with ELO tracking
- Team-oriented features alongside individual stats
- Acquired Mobalytics to strengthen analytics offerings

### 3.2 Match Data Presentation Patterns

The industry uses a hybrid approach:

**Match Cards (Most Common for Lists)**
- Compact card per match showing: teams/players, result (W/L), score, duration, date
- Win highlighted with color accent (green/blue border or background tint)
- Loss shown with muted/red tint
- Champion icon + KDA visible on card without expanding
- Click/tap to navigate to full match detail

**Tables (For Detailed View)**
- Full 10-player stats table on match detail page
- Columns: champion, summoner name, KDA, CS, damage, items, gold
- Two halves (Team A blue side / Team B red side) stacked or side-by-side
- Sortable columns for comparison
- Row highlighting for the viewing player's row

**Timeline (For Match Progress -- Not Applicable to VCLoL Yet)**
- Gold/XP graphs over time
- Event timeline (kills, objectives, dragon/baron)
- Requires real-time game data (beyond .rofl parse scope for now)

**Actionable for VCLoL:**
- Match list: use cards. Each card shows Team A vs Team B, score, date, match type badge
- Match detail: header card (teams, score, duration, map) + two 5-player stat tables (blue/red side)
- Player's own row highlighted in the stat table when viewing as logged-in participant
- Champion icons displayed as circular avatars in stat rows
- Items shown as small icon row per player

### 3.3 Mobile-First for Stats-Heavy Pages

Gaming stats platforms solve mobile density through:

1. **Prioritize 3-4 key fields per card**: champion icon, KDA, W/L result. Everything else is one tap away
2. **Horizontal scroll for tables**: freeze first column (player name + champion), scroll remaining stats. Clear scroll indicator
3. **Stacked card layout**: each table row becomes a mini card on mobile (label:value pairs stacked vertically)
4. **Swipeable sections**: swipe between "Overview" / "Builds" / "Runes" tabs on match detail
5. **Sticky header**: team names + score stays visible while scrolling through player stats
6. **Collapsible team sections**: tap Team A header to expand/collapse their 5 players

**Actionable for VCLoL:**
- Match cards on mobile: team names, score, date. Champion icon and KDA shown only if screen allows
- Match detail on mobile: stacked card layout for each player instead of wide table
- Team profile on mobile: roster as vertically stacked player cards (not horizontal grid)
- Use sticky header on match detail so team score is always visible while scrolling stats

### 3.4 Visual Patterns for Win/Loss, KDA, Performance

**Color Coding (Win/Loss)**
- Win: blue or green tint (never pure green -- accessibility concern for colorblind users)
- Loss: red tint or muted/gray
- OP.GG uses blue (win) / red (loss) which avoids red-green colorblind issues
- Blue and red are universally the best pair: red+green fails for colorblind, blue+green can look similar at distance
- Apply as subtle background tint on match cards, not just text color

**KDA Presentation**
- Format: `K / D / A` with slashes, or `K/D/A` compact
- KDA ratio (kills+assists/deaths) as a single number with color: green (>3.0), yellow (2.0-3.0), red (<2.0)
- Sparkline showing KDA trend over recent matches
- "Perfect KDA" badge when deaths = 0

**Performance Indicators**
- Badges/tags: "MVP", "ACE", "Pentakill", "CS King", "Vision Score" etc.
- One-line performance summary per match (OP.GG pattern)
- Win streak indicators (fire icon, streak count)
- Rank/tier iconography for competitive context

**Team Identity Colors**
- Dark theme with team's primary color as accent
- Team A vs Team B: use blue side / red side convention from League of Legends
- Neon accents on dark backgrounds for competitive energy
- Deep navy + royal blue backdrop with trophy gold and victory red accents

---

## 4. Modern Web Design Patterns (2024-2025)

### 4.1 Visual Style: Current State

**The 2025 landscape has settled on "refined flat" with selective depth:**

- **Glassmorphism** (frosted glass + transparency + blur): still used but maturing. Works well for overlays, modals, command palettes. Apple Vision Pro pushed this forward. Warning: overuse makes designs look samey. Best used sparingly for emphasis
- **Neumorphism** (soft embossed): fading from trend. Accessibility concerns (low contrast). Avoid for data-dense interfaces
- **Neubrutalism** (bold borders, raw aesthetics): niche. Good for personality-driven brands. Not appropriate for data tools
- **Current dominant style**: clean layouts, fluid gradients, asymmetric grids, organic shapes. Minimal but not sterile. Linear design aesthetic (monochrome with sparse accent color) is the SaaS benchmark

**Actionable for VCLoL:**
- Base: dark theme with clean flat cards on subtle background differentiation (not pure black -- use dark gray like #0A0A0B or #111114)
- Selective glassmorphism: command palette backdrop, modal overlays, tooltip backgrounds
- No neumorphism. No neubrutalism
- Accent color: one primary brand color + semantic colors (win/loss/rank)
- Gradient: use sparingly for hero sections or feature highlights, not throughout

### 4.2 Dark Mode for Data-Dense Interfaces

Dark mode is now the default expectation for gaming/developer/analytics tools:

**Color Rules:**
- Avoid pure black (#000) and pure white (#FFF). Use dark grays (#0A-#1A range) and off-whites (#E0-#F0 range)
- 4-5 contrasting colors max for data visualization on dark backgrounds
- Highly saturated colors are hard to read on dark backgrounds; use bright but slightly desaturated
- Semi-bold or medium font weights (not ultra-thin) for readability without glare
- Increase line spacing slightly to reduce visual density

**Chart/Data Vis Rules:**
- Colorful visualizations on dark backgrounds make data stand out
- Bar charts, line graphs, and pie charts preferred over text-heavy data tables
- Create a dedicated dark mode palette (never just invert light mode colors)
- Simplified color palette: too many colors overwhelm the eye in dark mode

**Actionable for VCLoL:**
- Default to dark mode. Support light mode as secondary option
- Background hierarchy: page bg (#0A0A0B) -> card bg (#141418) -> elevated bg (#1C1C22)
- Text hierarchy: primary (#F0F0F0) -> secondary (#A0A0A8) -> muted (#606068)
- Accent: brand blue or gold for primary actions. Semantic: win blue, loss red, KDA green/yellow/red
- Charts: use 3-4 colors max per chart. Solid fills with slight transparency for overlapping areas

### 4.3 Micro-Interactions and Animation (Framer Motion Trends)

**Standard Timing:**
- General sweet spot: 200-500ms
- Hover state transitions: 200ms on desktop
- Button click feedback: 300-500ms (color shift + subtle scale)
- Toast notifications: entrance 300-500ms, auto-hide after 2.5s, exit 200ms
- Navigation transitions: 300-500ms
- Skeleton shimmer: continuous until content loads

**Loading States:**
- **Skeleton screens**: wireframe-like placeholders matching final layout. Gray boxes with shimmer animation
- **Shimmer effect**: animated gradient (3-color gradient stops at 0.1, 0.3, 0.4) moving across placeholders
- Skeleton + shimmer feels faster than a spinner, even with identical wait times
- Loading indicator should appear if operation exceeds 300ms
- Avoid aggressive spinning; subtle pulsing is better

**Key Patterns for VCLoL:**
- Skeleton screens for match list loading (match card shapes with shimmer)
- Skeleton for player profile sections (avatar circle, text lines, stat boxes)
- Button loading states: spinner inside button, disabled state with opacity change
- Page transitions: subtle fade or slide (200-300ms) between routes
- Match card hover: slight elevation (translateY -2px) + shadow increase, 200ms
- Win/loss badge: gentle fade-in when match cards appear (staggered, 60ms delay per card)
- Pull-to-refresh: icon pulse between 100% and 150% size in pending state
- Respect `prefers-reduced-motion`: disable all non-essential animations

**Optimistic Updates vs. Skeleton vs. Progressive:**
- **Skeleton**: use when loading data for display (match list, profile, dashboard)
- **Optimistic update**: use when user performs action and expects immediate feedback (toggling visibility, favoriting a team)
- **Progressive loading**: load critical content first (match score), then secondary (player stats), then tertiary (items/builds)

### 4.4 Typography for Gaming/Esports

**Current Trends:**
- Sans-serif dominates for UI: clean lines, no serifs, versatile for UI elements and body text
- Esports has established its own typographic language: condensed, bold sans-serifs with sharp geometry
- Sharp angles and geometric shapes suggest speed and precision
- Monospace for data/stats: conveys technical precision, ensures number alignment
- Variable fonts allow smooth transitions between weights for dynamic responsive text
- Mixing font weights dramatically (ultra-thin headlines next to bold body) creates visual energy

**Recommended Approach for VCLoL:**
- **Headings**: geometric sans-serif (Inter, Geist, Space Grotesk, or custom). Bold/Black weight
- **Body**: same family at regular/medium weight for consistency
- **Stats/Numbers**: tabular/monospace figures for alignment (Inter has built-in tabular nums; JetBrains Mono for explicit mono)
- **KDA/Score**: bold mono or bold sans at larger size for emphasis
- **Match Type Badges**: all-caps condensed for compact labeling (SCRIM, TOURNAMENT, EVENT)
- Avoid: decorative/script fonts, ultra-thin weights on dark backgrounds, serif fonts (feel out of place in gaming context)

### 4.5 Color Theory for Competitive Contexts

**Team Identity:**
- Blue side / Red side is the League convention and should be maintained
- Dark navy background anchored by teal/cyan for rank icons, progress bars, callouts
- Neon colors reserved for buttons, kill counters, win banners (keeps focus on content)
- Team primary color as accent in their profile/branding areas

**Win/Loss/Performance:**
- Win: blue (#4A90D9 range) or teal/cyan -- avoids colorblind issues with green
- Loss: red (#D94A4A range) -- universally understood as negative
- Neutral/Draw: gray or amber
- KDA tiers: excellent (emerald), good (teal), average (amber), poor (red)
- Never rely on color alone: always pair with text label, icon, or pattern

**General Palette:**
- Primary: 1 brand color (used sparingly for CTAs, links, selected states)
- Semantic: win, loss, rank tiers (4-5 colors)
- Neutral: 5-7 grays from dark to light for backgrounds, borders, text hierarchy
- Accent: 1-2 highlight colors for badges, notifications, alerts

### 4.6 Card vs. Table Data Presentation

**Use Cards When:**
- Users browse/discover content (match history list, team gallery)
- Visual content is important (champion icons, team logos)
- Each item is consumed individually, not compared
- Mobile is a primary context (cards stack naturally)
- 3-4 key fields per item is sufficient

**Use Tables When:**
- Users need to compare across rows (10-player match stats)
- Data is structured, dense, and meant to be analyzed
- Users need to sort, filter, or perform bulk actions
- Desktop is the primary context
- More than 5 data points per item

**Hybrid Approach (Best for VCLoL):**
- Match list: cards (browsing pattern)
- Match detail player stats: table on desktop, stacked cards on mobile
- Team roster: cards on public view, table on admin/management view
- Player career teams: cards (each team is a discovery unit)
- Admin data management: always tables with sorting/filtering
- Leaderboards: tables (comparison is the entire point)

---

## 5. Navigation and Information Architecture

### 5.1 Command Palette (Cmd+K)

Now adopted across virtually all modern SaaS tools. Key implementations:

**Products Using Cmd+K:** Linear, Figma, Notion, GitHub, Todoist, Framer, Raycast, VS Code

**Implementation Standards:**
- Centered modal with blurred/dimmed backdrop
- Full-width search input at top with search icon and keyboard shortcut hint
- Results grouped by type: "Recent", "Teams", "Players", "Matches", "Actions"
- Fuzzy search with keyword matching
- Keyboard shortcuts displayed alongside commands for learning
- Recent commands displayed first for quick access

**Technical Libraries:** `cmdk` (open-source, already in VCLoL's stack), `kbar`, `CommandBar`

**Actionable for VCLoL:**
- VCLoL already has `cmdk` installed. Implement Cmd+K global search
- Groups: "Teams", "Players", "Matches", "Events", "Actions" (for logged-in users: "My Team", "Settings")
- Display keyboard shortcut hint in header ("Press Cmd+K to search")
- Fuzzy search across team names, player riot IDs, match dates
- For admins: add action commands (e.g., "Create Team", "Manage Players")

### 5.2 Contextual Navigation (Role-Based)

Modern SaaS shows different navigation based on user role:

**Visitor (Not Logged In):**
- Topbar with: Home, Teams, Players, Matches, Events, Login
- Minimal, focused on discovery and browsing

**Player (Logged In):**
- Same topbar + "My Profile", "My Team(s)", "Settings"
- Dashboard as landing page showing their recent matches, team activity
- Notification bell in header

**Captain (Logged In + Team Owner):**
- Player nav + "Captain Hub" with team management tools
- Contextual actions on match cards: "Set Visibility", "Edit"

**Admin:**
- Sidebar navigation (collapsible) with: Dashboard, Teams, Players, Matches, Events, Seasons, Settings
- Admin gets sidebar because they have many management pages and frequently switch between them
- Visitor/player gets topbar because they have fewer navigation items and need maximum content space

### 5.3 Sidebar vs. Topbar Decision

**Use Sidebar When (Admin):**
- More than 5 navigation items
- Items frequently expand (nested routes: Teams > Team Detail > Edit)
- Users need constant visibility of all sections
- RBAC filtering applies (show/hide menu items per role)
- Workspace-style tools with deep navigation

**Use Topbar When (Public/Player):**
- Fewer than 5 primary navigation items
- Content-focused pages that need maximum width
- Mobile-first context (topbar collapses to hamburger naturally)
- Browse/discover workflows where nav is secondary to content

**VCLoL already has this right:** AdminLayout uses sidebar, PublicLayout uses topbar.

### 5.4 Tab-Based Content Switching

**Best Practices:**
- Limit tabs to 3-5 per section (cognitive overload beyond that)
- Sticky tabs on mobile so they remain accessible while scrolling long content
- Lazy load tab content for performance (only render active tab's data)
- Animated underline indicator showing active tab
- Swipeable tabs on mobile (natural gesture for tab switching)
- URL-synced tabs: changing tabs updates URL hash so deep links work

**Actionable for VCLoL:**
- Team profile: tabs for Overview | Matches | Roster | Stats
- Player profile: tabs for Overview | Teams | Matches
- Match detail: tabs for Scoreboard | Timeline (future) | VOD (future)
- Admin team detail: tabs for Info | Members | Matches | Settings
- Use Radix UI Tabs (already in stack) with animated indicator

### 5.5 Breadcrumb Patterns

**When to Use:**
- Hierarchies deeper than 2 levels (VCLoL has: Teams > Team Profile > Match Detail)
- Help users orient within nested content
- Compress middle levels into ellipsis when space is tight

**Implementation:**
- Home > Teams > Team Alpha > Match #42
- Home > Players > xiNe#NA1 > Team Alpha History
- Keep breadcrumbs secondary in visual weight (small font, muted color)
- Never replace primary navigation; breadcrumbs are supplementary

**Actionable for VCLoL:**
- Show breadcrumbs on Team Profile, Player Profile, Match Detail, Event Detail
- Use the existing breadcrumb component (already in the UI library)
- Mobile: collapse to "< Back to [Parent]" link instead of full breadcrumb trail

---

## 6. Mobile-First Gaming Stats

### 6.1 Dense Data on Mobile

**Core Strategies:**
1. **Reduce to essentials**: show 3-4 fields per card on mobile. Hide secondary data behind tap/expand
2. **Stacked cards replace tables**: each table row becomes a mini card with label:value pairs stacked vertically
3. **Horizontal scroll with frozen columns**: for tables that must remain tables, freeze the first column (player name/champion) and let remaining columns scroll horizontally with visible scroll indicator
4. **Priority columns**: on mobile, show only the most critical columns (Name, KDA, W/L). Drop Budget, Notes, etc.
5. **Sticky headers**: keep team names + score visible while scrolling through player stats
6. **Bottom sheet for details**: tap a player row to see full stats in a bottom sheet overlay rather than navigating away

### 6.2 Swipeable Cards vs. Scrollable Tables

**Swipeable Cards:**
- Natural mobile gesture for switching between related views (e.g., Team A stats / Team B stats)
- Good for comparing two things side-by-side mentally (swipe between them)
- Works well with 2-5 items (not for long lists)

**Scrollable Tables:**
- Better for comparing many items (10 players in a match)
- Horizontal scroll with frozen first column
- Visible scroll indicator so users know there is more data

**Recommendation for VCLoL:**
- Match detail: swipeable tabs for Team A / Team B sections
- Player stats across matches: vertical scrollable list of match cards
- Leaderboard: scrollable table with frozen team name column
- Do NOT use swipeable cards for match list (too many items; vertical scroll is better)

### 6.3 Bottom Sheet for Detail Views

**When to Use:**
- Brief interactions only (not multi-step flows)
- Displaying contextual details without full page navigation
- Player quick-view: tap a player in match stats to see their profile summary
- Filter/sort options for match lists

**Rules:**
- Support back button/gesture for dismissal
- Include visible close button (X), not just swipe
- Never stack multiple bottom sheets
- Modal bottom sheets (with scrim) for focused interactions
- Non-modal for supplementary info that can coexist with background

**Actionable for VCLoL:**
- Tap a player in match detail -> bottom sheet with mini profile (avatar, riot ID, KDA for this match, link to full profile)
- Filter button on match list -> bottom sheet with date range, match type, team filters
- NOT for: full match detail view (too much content; use full page instead)

### 6.4 Pull-to-Refresh and Pagination

**Pull-to-Refresh:**
- Standard on mobile for list views (match list, team list)
- Refetch first page and reset infinite scroll history (common mobile behavior)
- Five states: Idle, Interacting, Pending (pulse icon), Refreshing (spinner), Completion (check)

**Pagination vs. Infinite Scroll for VCLoL:**
- **Match list**: infinite scroll (discovery-focused, mobile-primary, chronological)
- **Team list**: pagination (users search for specific teams, need bookmarkable pages)
- **Player list**: pagination (search/filter oriented)
- **Leaderboard**: pagination (structured comparison data)
- **Admin tables**: pagination (always; for performance and URL state)
- Store pagination state in URL to prevent position loss on refresh

---

## 7. Onboarding and Empty State Design

### 7.1 First-Time User Experience

**Current Best Practices (2025-2026):**
- Ask 1-2 routing questions at signup to personalize the experience
- Replace static tours with contextual guidance responding to user behavior
- Onboarding checklists drive 40%+ activation rates vs. 25-30% industry norm
- Minimize steps: every additional step loses users

**Patterns:**
1. **Contextual hints**: show tooltip on first visit to a feature, dismiss permanently after use
2. **Onboarding checklist**: 3-5 items (connect Discord, link RSO, join a team, view first match)
3. **Welcome modal**: brief intro with CTA to first action
4. **Interactive demos**: let users explore with sample data before requiring real data

**Actionable for VCLoL:**
- New player flow: Welcome -> Connect Discord -> Link RSO -> View your team -> Browse matches
- Show checklist in player dashboard until all steps complete
- Each uncompleted step has clear CTA and explanation of value
- Celebrate completion of each step (subtle animation, checkmark)

### 7.2 Empty State Design

**Types VCLoL Will Encounter:**
1. **First-use**: New team with no matches. New player with no team
2. **No-data**: Search returns no results. Filter combination yields nothing
3. **Error**: Failed to load data. Network error

**Best Practices:**

Do NOT show generic "No data yet" messages. Instead:

1. **Explain + Guide**: "No matches recorded yet. Submit your first .rofl in Discord with /submit"
2. **Show sample data**: "Here's what your team stats will look like" with realistic placeholder
3. **Direct CTA**: Button or link to the action that fills this empty state
4. **Brand personality**: Custom illustration or icon (not just a blank void)
5. **Educational**: Brief explanation of what this section is for

**Specific VCLoL Empty States:**

| Context | Empty State Message | CTA |
|---------|-------------------|-----|
| Team with no matches | "Record your first match! Use /submit in Discord to upload a .rofl file." | "How to submit a match" link |
| Player with no team | "Join a team to start building your competitive resume." | "Browse Teams" button |
| Match list (no results) | "No matches found for these filters." | "Clear filters" button |
| Player profile (private) | "This player's profile is private." | (no CTA for visitors) |
| Player profile (no RSO) | "Connect your Riot account to verify your identity and build your profile." | "Connect via RSO" button |
| Leaderboard (new season) | "Season just started! Rankings will appear after the first matches are recorded." | "View schedule" or "Submit match" |
| Team roster (empty) | "No active players yet. Players are added automatically when match .rofl files are submitted." | "How rosters work" link |

### 7.3 Progressive Onboarding for Different Roles

**Visitor**: No onboarding needed. Browse freely. Login CTA in header
**Player**: After first login, show dashboard with checklist (connect RSO, view profile, find team)
**Captain**: After creating team, show captain-specific tips (how to submit matches, manage roster, set visibility)
**Admin**: First admin login shows quick tour of management sections

---

## 8. Summary: VCLoL-Specific Design Recommendations

### Design System Foundation
- **Theme**: Dark mode default (dark gray, not pure black). Light mode optional
- **Visual style**: Linear-inspired clean flat with selective glassmorphism for overlays
- **Typography**: Geometric sans-serif (Inter/Geist) + tabular numbers for stats
- **Color**: brand accent + semantic (win blue, loss red, KDA tiers) + neutral gray scale
- **Layout**: responsive cards for browsing, tables for comparison, bento for dashboards
- **Animation**: Framer Motion, 200-500ms timing, respect reduced-motion

### Key Patterns to Implement
1. Cmd+K global search (cmdk already installed)
2. Progressive disclosure on all data views (summary -> click for detail)
3. Skeleton loading with shimmer for all async data
4. Role-based navigation (topbar for public, sidebar for admin)
5. Breadcrumbs for hierarchies deeper than 2 levels
6. Bottom sheets on mobile for quick detail views
7. Sticky headers on scrollable data views
8. Empty states with educational CTAs on every zero-data view
9. Privacy indicators (lock/eye icons) on profiles and matches
10. Bento grid for dashboard/overview pages, vertical lists for chronological data

### Match Data Display Hierarchy
1. **Match list**: cards (Team A vs Team B, score, date, type badge)
2. **Match detail**: header card + 10-player stat table (desktop) / stacked cards (mobile)
3. **Player in match**: champion icon, KDA, CS, items, win/loss indicator
4. **Hover**: tooltip with additional context (exact K/D/A, gold, damage)

### Player Career Display Hierarchy
1. **Profile header**: avatar, riot ID, privacy state, total games, overall W/L
2. **Team history**: reverse chronological cards per team
3. **Per-team stats**: W/L, avg KDA, champions played
4. **Deep dive**: per-match breakdown within each team tenure

### Color Palette Guidance
```
Background:
  page:       #0A0A0B
  card:       #141418
  elevated:   #1C1C22
  border:     #2A2A32

Text:
  primary:    #F0F0F0
  secondary:  #A0A0A8
  muted:      #606068

Semantic:
  win:        #4A90D9 (blue, not green)
  loss:       #D94A4A (red)
  kda-great:  #4ACFA9 (emerald)
  kda-good:   #5BC0DE (teal)
  kda-avg:    #E6A23C (amber)
  kda-poor:   #D94A4A (red)

Accent:
  brand:      [TBD - team primary color]
  gold:       #D4A853 (tournament/achievement)
```

---

## Sources

### Dashboard Design
- [Top Dashboard Design Trends for 2025 | Fuselab Creative](https://fuselabcreative.com/top-dashboard-design-trends-2025/)
- [20 Best Dashboard UI/UX Design Principles 2025 | Medium](https://medium.com/@allclonescript/20-best-dashboard-ui-ux-design-principles-you-need-in-2025-30b661f2f795)
- [I studied 5 popular dashboard UIs | LogRocket](https://blog.logrocket.com/ux-design/dashboard-ui-best-practices-examples/)
- [Linear Design: The SaaS Trend | LogRocket](https://blog.logrocket.com/ux-design/linear-design/)
- [Vercel's New Dashboard UX | Medium](https://medium.com/design-bootcamp/vercels-new-dashboard-ux-what-it-teaches-us-about-developer-centric-design-93117215fe31)
- [Dashboard Design Best Practices 2025 | 5of10](https://5of10.com/articles/dashboard-design-best-practices/)
- [Curated Dashboard Design Examples 2026 | Muzli](https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/)

### Dark Mode & Data Visualization
- [Dark Mode Dashboard Design Principles | Qodequay](https://www.qodequay.com/dark-mode-dashboards)
- [Designing Power BI Dashboards in Dark Mode | Numerro](https://www.numerro.io/blog/designing-dashboard-in-dark-mode)
- [Dark Mode for Data Visualizations | Medium](https://ananyadeka.medium.com/implementing-dark-mode-for-data-visualizations-design-considerations-66cd1ff2ab67)

### Bento Grid Layouts
- [Bento Grid Design: 40+ Examples | MukeshK](https://mukeshkdesigns.com/blogs/bento-grid-design-inspiration/)
- [Bento Grid Web Design Guide 2025 | WebTechNeeq](https://webtechneeq.com/blog/the-ultimate-guide-to-bento-grid-web-design-for-2025/)
- [Understanding The Bento Layout Trend | SaaSFrame](https://www.saasframe.io/blog/the-bento-layout-trend)
- [BentoGrids.com](https://bentogrids.com/)

### Progressive Disclosure
- [Progressive Disclosure | NN/g](https://www.nngroup.com/articles/progressive-disclosure/)
- [The Power of Progressive Disclosure in SaaS UX | Lollypop](https://lollypop.design/blog/2025/may/progressive-disclosure/)
- [Progressive Disclosure Examples | Userpilot](https://userpilot.com/blog/progressive-disclosure-examples/)

### Gaming/Esports Platforms
- [Tracker Network](https://tracker.gg/)
- [OP.GG](https://op.gg/)
- [Mobalytics Acquired by ESL FACEIT Group](https://esportsinsider.com/2025/03/esl-faceit-group-mobalytics-acquisition)
- [OP.GG Desktop App](https://op.gg/desktop/)
- [LoL Data Visualization | Pratt Institute](https://studentwork.prattsi.org/infovis/projects/league-of-legends-data-visualization/)

### Typography & Color
- [Font Choices For Esports And Gaming](https://auschwitzcracow.com/super-updates/font-choices-for-esports-and-gaming-1767647348)
- [Font Trends 2025 | Fontspring](https://www.fontspring.com/trends)
- [24+ Best Esports Fonts 2025 | Just Creative](https://justcreative.com/best-esports-fonts/)
- [Gaming Color Palettes | Media.io](https://www.media.io/color-palette/gaming-color-palette.html)
- [Gaming Color Palettes | Piktochart](https://piktochart.com/tips/gaming-color-palette)

### Visual Style Trends
- [Design Trends 2025: Glassmorphism, Neumorphism | Contra](https://contra.com/p/PYkeMOc7-design-trends-2025-glassmorphism-neumorphism-and-styles-you-need-to-know)
- [Top 25 Web Design Trends 2025 | AufaitUX](https://www.aufaitux.com/blog/web-design-trends-2025/)
- [Modern Web Design Styles 2025 | DEV Community](https://dev.to/homayounmmdy/modern-web-design-styles-every-frontend-developer-must-know-2025-guide-1ijl)

### Micro-Interactions & Animation
- [12 Micro Animation Examples 2025 | BricxLabs](https://bricxlabs.com/blogs/micro-interactions-2025-examples)
- [Motion UI Trends 2025 | Beta Soft Technology](https://www.betasofttechnology.com/motion-ui-trends-and-micro-interactions/)
- [Framer: 11 Animation Techniques for UX](https://www.framer.com/blog/website-animation-examples/)
- [Micro-Interactions: Tiny Details, Big Impact 2025 | Blaze Dream](https://www.blazedream.com/blog/microinteractions-enhancing-ux-2025/)

### Navigation Patterns
- [Command Palette UX Patterns | Medium](https://medium.com/design-bootcamp/command-palette-ux-patterns-1-d6b6e68f30c1)
- [Command K Bars | Maggie Appleton](https://maggieappleton.com/command-bar)
- [Sidebar vs Topbar | LinkedIn](https://www.linkedin.com/pulse/saas-ux-series-sidebar-vs-topbar-srikanth-kalakonda)
- [SaaS Navigation Menu Design | Lollypop](https://lollypop.design/blog/2025/december/saas-navigation-menu-design/)
- [Breadcrumb Pattern | UX Patterns](https://uxpatterns.dev/patterns/navigation/breadcrumb)

### Cards vs Tables
- [Card View vs Table View | Medium](https://medium.com/design-bootcamp/when-to-use-which-component-a-case-study-of-card-view-vs-table-view-7f5a6cff557b)
- [Mobile Tables | NN/g](https://www.nngroup.com/articles/mobile-tables/)
- [Table Design UX Guide | Eleken](https://www.eleken.co/blog-posts/table-design-ux)

### Mobile Patterns
- [Bottom Sheets: Definition and UX Guidelines | NN/g](https://www.nngroup.com/articles/bottom-sheet/)
- [Bottom Sheet UI Design | Mobbin](https://mobbin.com/glossary/bottom-sheet)
- [Pagination vs Infinite Scroll | UX Patterns](https://uxpatterns.dev/pattern-guide/pagination-vs-infinite-scroll)

### Onboarding & Empty States
- [Empty State in SaaS Applications | Userpilot](https://userpilot.com/blog/empty-state-saas/)
- [SaaS Onboarding Best Practices 2025 | ProductLed](https://productled.com/blog/5-best-practices-for-better-saas-user-onboarding)
- [SaaS Onboarding Flows 2026 | SaaSUI](https://www.saasui.design/blog/saas-onboarding-flows-that-actually-convert-2026)
- [Empty State Interface Design | NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)

### Privacy Design
- [Privacy-First UX Design Systems | Medium](https://medium.com/@harsh.mudgal_27075/privacy-first-ux-design-systems-for-trust-9f727f69a050)
- [Privacy Starts with UI | arXiv](https://arxiv.org/html/2601.13342v1)

### Profile/Portfolio Design
- [Polywork Reviews | Product Hunt](https://www.producthunt.com/products/polywork/reviews)
- [How To Build a UI Portfolio 2025 | Springboard](https://www.springboard.com/blog/design/ui-portfolio/)

### Loading States
- [Skeletons in React 19 | Medium](https://balevdev.medium.com/skeletons-the-pinnacle-of-loading-states-in-react-19-427cbb5a1f48)
- [React Loading Skeleton | LogRocket](https://blog.logrocket.com/handling-react-loading-states-react-loading-skeleton/)
