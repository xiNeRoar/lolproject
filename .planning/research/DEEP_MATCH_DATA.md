# Deep UX Research: Match Data & Stats Display

**Researched:** 2026-03-28
**Domain:** Competitive gaming match data, data-dense dashboards, sports analytics
**Overall confidence:** HIGH (based on direct platform analysis, official documentation, established UX research)

---

## 1. Platform-by-Platform Analysis

### 1.1 OP.GG -- THE Reference for LoL Match Data

**Confidence:** HIGH (direct platform analysis + official help center + multiple sources)

#### Match List (Summoner Profile Match History)

**What shows on each collapsed match card (left to right):**
1. **Win/Loss indicator** -- colored left border bar (blue = win, red = loss)
2. **Queue type** -- "Ranked Solo", "Normal", "ARAM" etc in small text
3. **Timestamp** -- relative ("3 hours ago") or absolute ("Mar 27")
4. **Champion portrait** -- circular icon, 32-40px
5. **Summoner spells** -- two small icons stacked vertically beside champion
6. **Runes** -- primary keystone + secondary tree as small icons
7. **KDA** -- `K / D / A` with the ratio on a second line (e.g., "3.50:1 KDA")
8. **CS** -- total CS with CS/min in parentheses
9. **Vision score** -- small eye icon + number
10. **Items** -- 6+1 item icons in a row (including trinket)
11. **Kill participation** -- percentage badge
12. **Other players** -- tiny champion icons for all 10 players in 2 rows (5 per team), clickable

**Critical design decisions:**
- Win/loss is communicated BEFORE any data is read -- the colored background tint (light blue vs light red) is the first thing the eye processes
- KDA ratio is a single number with color coding: excellent (emerald), good (blue), average (gray), poor (red). This IS the at-a-glance performance indicator
- Items row provides instant "what did they build?" context without expanding
- 10 tiny champion icons at the right edge let users see team composition at a glance

**Progressive disclosure -- what clicking "More" reveals:**
- Full 10-player scoreboard table (two teams, 5 per team)
- Per-player columns: champion icon + name, spells, runes, KDA, damage dealt, damage taken, wards placed/destroyed, CS, gold
- Team total rows at bottom of each team section
- Blue/red side color coding on team headers
- Build order timeline
- Gold/XP advantage graphs
- OP Score badges (MVP for winning team, ACE for losing team)
- Performance badges: "Kill Participation King", "Damage King", "Vision God", etc.
- Rune details and skill order

#### What (summoner profile header) shows ABOVE the match list:
- Summoner icon + level
- Rank emblem + tier text + LP
- Win/Loss record + win rate %
- Recent 20 games summary: W-L count, avg KDA, top 3 champions played (with individual win rates)
- Champion pool ranked by games played

#### Why this hierarchy works:
The summoner is asking ONE question: "How am I doing?" The answer flows from general to specific:
1. Rank/tier = overall standing
2. Recent W/L + KDA = recent trajectory
3. Individual match cards = specific game review
4. Expanded detail = forensic analysis

Each level answers a progressively deeper question. A user can stop at any level and feel satisfied.

#### Mobile treatment:
- Match card shrinks to: champion icon + W/L color + KDA + items (no CS, no vision, no mini-champion row)
- Expand arrow reveals full detail in a bottom sheet or inline expansion
- Horizontal scroll on expanded 10-player table with frozen player name column

---

### 1.2 U.GG -- Where It Differs from OP.GG

**Confidence:** MEDIUM (direct platform analysis, less official documentation available)

#### Key differences from OP.GG:

1. **Champion stats table on profile** -- U.GG gives more prominence to per-champion aggregate stats than OP.GG does. Where OP.GG shows a small "most played" section, U.GG dedicates a full sortable table with columns: Champion, LP contribution, KDA, Win Rate, Games Played. This is more analytical and scout-friendly.

2. **LP tracking per champion** -- U.GG uniquely shows how much LP each champion has earned or lost, making it clear which champions are "LP positive" vs "LP negative." This has no direct VCLoL equivalent but the concept of "which champion does this player win on" is directly relevant.

3. **Cleaner, less dense match cards** -- U.GG match history cards are slightly less dense than OP.GG. They show champion, KDA, items, and result but give more whitespace. Trade-off: less information at a glance, but less overwhelming.

4. **Rank history visualization** -- U.GG shows a multi-season rank timeline in the sidebar. This is analogous to VCLoL's "career resume" concept: showing trajectory over time.

5. **Build path integration** -- U.GG integrates recommended builds more tightly with match history, so users see "optimal" vs "what I built" comparisons.

#### What U.GG does better than OP.GG:
- Per-champion aggregate stats table is more useful for scouting
- Win rate percentages alongside KDA is more actionable
- Multi-season rank history is more visible

#### What OP.GG does better:
- More data density per match card (you see more without clicking)
- OP Score and performance badges add evaluative context beyond raw numbers
- Better mobile experience (more polished)

---

### 1.3 ESPN / NBA Stats -- Sports Data Display

**Confidence:** HIGH (established patterns, multiple design analyses available)

#### Game Result Page (Box Score):

**Information hierarchy (top to bottom):**
1. **Score bug** -- horizontal bar: Team A Logo [Score] - [Score] Team B Logo, with game status (Final, Q3 2:41, etc.). This is THE focal point. Everything below it is context.
2. **Quick stats summary** -- 3-4 headline stats per team (points in paint, fast break points, rebounds)
3. **Player stats table** -- TWO tables stacked (one per team), each with:
   - Column headers: Player, MIN, PTS, REB, AST, STL, BLK, TO, FG%, 3P%, FT%
   - Player name + jersey number + position
   - Team totals row at bottom
   - Starter/bench visual separation (horizontal divider line)
4. **Game flow chart** -- lead changes over time
5. **Play-by-play** -- chronological event log

**Critical design decisions:**
- Score is HUGE (48-72px font) and centered. The result is the primary information.
- Team colors are used as accent on the score bug but NOT throughout the tables (tables stay neutral for readability)
- Player stats tables use monospace-aligned numbers for scannability. Every number in a column aligns vertically.
- Horizontal scrolling on mobile with frozen player name column
- Starters vs bench separation is a subtle but important hierarchy cue

**Better NBA Box Score (Glenn McComb analysis):**
- Proposed placing teams SIDE BY SIDE instead of stacked for easier comparison
- Added "Four Factors" advanced metrics (effective FG%, turnover rate, offensive rebounding %, free throw rate)
- Yellow background highlight for live-updating stats during a game
- Play-by-play integrated below the box score to eliminate tab switching
- Advanced stats via checkbox toggle (not a separate page)

**Key principle:** The box score separates WHAT HAPPENED (score, result) from HOW IT HAPPENED (player stats, play-by-play). The score answers the question everyone has. Player stats answer "who performed?"

#### What VCLoL should adopt from ESPN/NBA:
- **Score-first hierarchy**: Team A [Score] vs Team B. Result visible in < 1 second.
- **Two-table layout for 10 players**: Blue side table above, red side table below. Team name + result as header for each.
- **Column alignment**: Use tabular/monospace numbers. KDA digits should align vertically across rows.
- **Starter/role separation**: Show team position (TOP, JG, MID, ADC, SUP) as visual ordering or label.

---

### 1.4 Bloomberg Terminal / Stripe Dashboard -- Making Dense Data Scannable

**Confidence:** HIGH (multiple official and analytical sources)

#### Bloomberg Terminal Patterns:

**How they make extreme density work:**
1. **Tabbed panel model** -- replaced fixed 4-panel maximum with arbitrary tabbed windows. Users customize what they see. Key insight: power users want density, but THEY choose what.
2. **At-a-glance Launchpad** -- the most critical data in a customizable dashboard. Dynamic multi-asset monitors, alerts, charts, news. Everything is live-updating.
3. **Consistent grid** -- despite density, every element snaps to a grid. Alignment creates implicit structure even without borders or separators.
4. **Color coding for state** -- green = up, red = down. Never decorative color. Every color means something.

**Key Bloomberg principle:** Bloomberg does NOT hide complexity. It surfaces it with consistent visual encoding so trained users can scan a wall of data at speed. This works because their users are professionals who use it 8+ hours/day.

**Why VCLoL should NOT copy Bloomberg:** VCLoL users are NOT financial professionals. They visit after a scrim, check their stats, and leave. Density must be earned through progressive disclosure, not presented upfront.

#### Stripe Dashboard Patterns:

**How Stripe makes financial data scannable:**
1. **Summary metrics first** -- Revenue, successful payments, new customers. 3 cards at top. Each with a single number + sparkline showing trend.
2. **6 type sizes** -- Stripe uses exactly 6 font sizes/weights to create hierarchy. Primary metric (huge, bold), metric label (small, muted), section headers (medium, semibold), body text, captions, badges.
3. **Drill-down navigation** -- Home > Payments > individual payment. Each level shows a summary with a link to go deeper. You never see ALL data at once.
4. **F-pattern optimization** -- most important data in top-left. Summary cards arranged horizontally across the top. Detail tables below.
5. **White space as separator** -- Stripe uses generous spacing between sections instead of heavy borders. Cards float on a subtle background.
6. **Contextual sparklines** -- every key metric has a tiny inline chart. The number tells "what", the sparkline tells "trending how".

**What VCLoL should adopt from Stripe:**
- **Summary card pattern**: Match result as a prominent summary card (teams, score, duration) ABOVE any detailed data
- **Limited type hierarchy**: Use 4-5 distinct text sizes max. Team names large, player names medium, stat values small-medium monospace, labels small muted.
- **Sparkline for trend data**: On player profiles, show KDA trend as a sparkline beside the aggregate number
- **Whitespace as hierarchy**: Separate blue side from red side with generous whitespace, not just a colored divider bar.

---

### 1.5 Tracker.gg -- Multi-Game Stats Display

**Confidence:** MEDIUM (indirect analysis, aggregated from multiple sources)

#### How Tracker.gg handles different games with different data shapes:

1. **Unified profile header** -- regardless of game, the profile always shows: username, rank/rating, W/L record, K/D ratio. These 4 are universal across all games.
2. **Game-specific detail sections** -- below the universal header, sections adapt to the game. Valorant shows agents, headshot %. Fortnite shows placement, builds. Each game has its own stat vocabulary.
3. **Match history cards** -- consistent card layout across games: result (W/L), map/mode, date, 3-4 key stats, agent/champion/legend icon. Details vary by game.
4. **Leaderboards** -- filterable by platform, region, time frame. Table layout with rank, player, key stats.
5. **XP/Challenges system** -- meta-gamification layer on top of raw stats. Badges, challenges, awards. This drives engagement beyond just viewing stats.

**What Tracker.gg does well:**
- Universal framework (profile header, match cards, leaderboards) with game-specific content
- Advanced match filters (Premium feature): filter by specific conditions (high-kill games, specific agents)
- Clean card-based match list that works on mobile
- Badge/achievement system for engagement

**What VCLoL should adopt:**
- **Consistent card framework for match list**: Team A vs Team B, result, date, 2-3 key stats. Always the same structure.
- **Match type badge** on each card: "SCRIM" / "TOURNAMENT" / "EVENT" as a visual tag
- **Team composition icons** on the match card (small champion portraits for both teams)

---

## 2. What VCLoL Should Adopt and WHY

### 2.1 Match List Page Recommendations

**Current state problems:**
The current Matches.tsx is a simple vertical list of cards showing Team A vs Team B, score, match title, date. No champion data, no KDA preview, no visual W/L indicators beyond text color. No match type badges beyond "Playoff" and "format."

**Recommendation 1: Add Win/Loss Color Tint to Match Cards**

WHY: Every platform studied (OP.GG, U.GG, Tracker.gg, ESPN) uses color to communicate result BEFORE text is read. The human eye processes color faster than text. A blue-tinted card = win, red-tinted card = loss. This is table stakes.

WHO benefits: Every viewer type. Anonymous visitors scanning a team's results. Players reviewing their own history. Scouts evaluating a team's performance.

WHEN used: Right after a scrim (checking result), during team evaluation (scanning W/L pattern), during scouting.

WHERE: On every match card in every match list context (Matches page, Team Profile matches tab, Dashboard recent matches).

HOW: Left border accent (4px solid blue/red) or subtle background tint (blue-500/5% opacity for win, red-500/5% for loss). Apply per-team: the card shows perspective of the team being viewed. On the global /matches page without team context, no tint (neutral presentation).

5W1H justification: The WHAT is a colored tint. The WHY is cognitive speed -- result comprehension drops from 2-3 seconds (read text, parse "vs", find winner name, match to team) to < 0.5 seconds (see blue = win). The WHO is every user. The WHEN is every visit. The WHERE is every match card. The HOW is CSS class toggle based on `match.winnerName === contextTeam.name`.

**Recommendation 2: Show Champion Composition on Match Cards**

WHY: OP.GG shows 10 tiny champion icons on every match card. This is the most requested feature in gaming stats UIs because it answers "what did they play?" without clicking. For VCLoL, this is particularly important because champion selection IS the narrative of a match.

WHAT: Two rows of 5 small champion portraits (20-24px), one row per team, on the right side of the match card. Blue side top, red side bottom.

WHO: Players reviewing their own history (what did I play?), scouts evaluating champion pools, opponents reviewing what compositions a team runs.

5W1H: The WHAT is 10 champion icons per card. The WHY is that champion composition is the second most important match context after result (confirmed by OP.GG/U.GG making it a default visible field). The WHO is players and scouts. The WHEN is during review and preparation. The WHERE is on the match card, right side. The HOW is pulling from matchPlayers data and rendering champion portraits using the existing `champPortraitUrl` utility.

**Implementation note:** This requires the match list API to return champion data per match. Currently `useListMatches` returns only team names, score, dates. Either embed champion arrays in the list response or accept a separate request per match (not recommended for list performance).

**Recommendation 3: Add Match Duration to Match Cards**

WHY: ESPN always shows game duration. OP.GG shows it. Duration is a quality-of-life context indicator -- a 20-minute stomp tells a different story than a 45-minute slugfest.

WHAT: "32:14" text beside the date, or as a small badge.

**Recommendation 4: Match Type Badge System**

WHY: VCLoL has 3 match types with fundamentally different privacy and data rules. Users MUST know what type of match they are looking at before clicking in. Tracker.gg does this with game mode badges.

WHAT: Color-coded badges per match type:
- `SCRIM` -- muted/neutral badge (gray outline), the default
- `TOURNAMENT` -- gold/amber badge, communicating competitive significance
- `EVENT` -- teal/primary badge

WHERE: On every match card, beside the date/duration.

---

### 2.2 Match Detail Page Recommendations

**Current state problems:**
The current MatchDetail.tsx has good bones but several issues:
1. Score presentation uses generic `match.score` string -- no visual emphasis on the winner
2. ELO delta display references scrim ELO (v3.1 removed scrim ELO)
3. Player stats table has good columns but no visual hierarchy within rows
4. No MVP/performance indicator
5. No team composition summary above the table
6. Items only show on lg breakpoint -- hidden on most screens
7. No match duration in the header (it exists as a badge but blends into other badges)
8. "VCLoL explainer" banner for non-logged-in users is good but takes too much vertical space
9. Player's own row highlighting is good (blue left border) but could be stronger

**Recommendation 5: Restructure Match Header into Score-First Design**

WHY: ESPN's #1 design principle is score-first. The current VCLoL header shows matchTitle first (which is often a generic "VancouverStorm vs PacificRift"), then badges, then score. This is backwards. The score IS the headline.

WHAT (new hierarchy, top to bottom):
1. **Breadcrumb**: "< Matches" (already exists, keep it)
2. **Score centerpiece** (the largest element on the page):
   ```
   [Team A Logo/Tag]  Team A Name    1 - 0    Team B Name  [Team B Logo/Tag]
                       [WIN]                    [LOSS]
   ```
   Team names large (text-2xl), score HUGE (text-5xl font-bold), winner name gets accent color, loser stays muted.
3. **Context badges row**: Duration, Match Type, Patch, Event, Season -- horizontally, small, below the score
4. **VCLoL explainer** (for non-logged-in only): collapsed by default to a single line "What is VCLoL?" that expands on click. Current implementation takes too much space.

5W1H: WHAT = score-first header layout. WHY = every user's first question is "who won and by how much?" not "what patch was this?" ESPN, OP.GG, every sports site confirms this. WHO = everyone. WHEN = on page load, the result should be comprehensible in < 1 second. WHERE = top of MatchDetail page. HOW = restructure the existing JSX to elevate score, demote metadata.

**Recommendation 6: Two-Section Player Stats with Team Headers**

WHY: The current table combines both teams into one table with colored header rows. OP.GG, ESPN, and U.GG all use visually separated team sections. This is better because:
- It creates "Blue Side" and "Red Side" as distinct visual regions
- Each team section can have its own summary row (team totals)
- Winner's section can have a subtle accent (matching the win color)

WHAT: Two separate Card components, each containing a 5-player table:
- Blue side card: subtle blue-500/5% background tint for the winning team, or neutral for loser
- Red side card: subtle red-500/5% background tint
- Each card header shows: Team Name [Win/Loss badge] + team tag
- Each card has a totals row at the bottom (team total kills, deaths, assists, CS, gold, damage)

**Recommendation 7: Highlight MVP / Best Performer**

WHY: OP.GG's most distinctive match detail feature is the MVP/ACE badges. It adds EVALUATIVE context on top of raw data. Without it, users must mentally compute "who played best?" from the numbers. With it, the answer is immediate.

WHAT: Calculate a simple performance score per player: `(kills + assists) / max(1, deaths) * kill_participation_weight`. Award "MVP" badge to the top performer on the winning team. Award "ACE" to the top performer on the losing team.

WHERE: Inline with the player name in the stats table. Small gold badge for MVP, silver for ACE.

HOW: Compute client-side from the matchPlayers data. No API change needed.

**Recommendation 8: Show Items at All Breakpoints**

WHY: Items are hidden below lg breakpoint in the current implementation. On a 5v5 competitive game, items are CRITICAL context. OP.GG shows items on every match card, even in the collapsed view. U.GG does the same.

WHAT: Show items at all breakpoints. On mobile (< sm), show items as a row of tiny icons (16px) below the KDA line instead of in a separate column. On tablet+, show in the table column.

**Recommendation 9: Add Column-Aligned Monospace Numbers**

WHY: Bloomberg and ESPN both use tabular-aligned numbers in stats tables. When KDA values like "8/2/11" and "3/7/4" don't align vertically, scanning a column becomes hard. This is a small but high-impact detail.

WHAT: Use `font-variant-numeric: tabular-nums` on all stat cells. KDA should use fixed-width formatting: right-align kills, center slash, right-align deaths, center slash, right-align assists. Or simply use monospace font for the entire stats portion.

HOW: Inter font (already in VCLoL stack per design guide) supports tabular-nums natively. Add `tabular-nums` to the table cells.

---

### 2.3 Privacy-Gated Display Recommendations

**Recommendation 10: Design the "Restricted" State as First-Class UI**

WHY: VCLoL's 3-layer privacy model means many match detail pages will show restricted content. The current implementation shows a "Stats are private" card when matchPlayers is empty. This is functional but does not communicate what the user COULD see if they logged in or became a participant.

WHAT: For scrim matches viewed by non-participants, show:
1. Score and team names (always public)
2. A "ghost" stats table: show 10 rows with champion icons and team position visible, but KDA/CS/Gold/Items replaced with "--" or a subtle lock icon. This communicates "data exists but is private."
3. Call-to-action: "Log in to see full stats (participants only)" or "This is a scrim match. Full stats are visible to participants."

WHY NOT just hide the table? Because a blank page with "stats are private" tells the user NOTHING about what they are missing. The ghost table communicates the richness of data available, creating motivation to log in. ESPN does this with paywalled content -- they show the structure of what is behind the wall.

For tournament matches (always public), show everything. No gate.

---

## 3. What VCLoL Should NOT Adopt and WHY

### 3.1 Do NOT Copy OP.GG's Density on Match Cards

WHY NOT: OP.GG shows 10+ data fields per match card because their audience uses OP.GG as a PRIMARY tool, visiting daily and reviewing 5-20 matches per session. VCLoL users play 1-3 scrims per session and visit occasionally. VCLoL's match list should be LESS dense than OP.GG, closer to ESPN's clean score presentation.

WHAT TO DO INSTEAD: Show 4-5 fields max per match card: teams, score, champion composition, match type badge, date/duration. No inline KDA, no items, no CS on the list card. Those belong on the detail page.

### 3.2 Do NOT Implement Bloomberg-Style Density

WHY NOT: Bloomberg works because users spend 8+ hours/day in it and have built mental models over months. VCLoL users are casual visitors. Density without training creates cognitive overload. The Pencil & Paper dashboard research calls this "data eyeball attack."

WHAT TO DO INSTEAD: Progressive disclosure. Summary first (Stripe pattern), detail on click (OP.GG expand pattern).

### 3.3 Do NOT Add Real-Time Match Tracking Features

WHY NOT: OP.GG and U.GG show live game status because they have Riot API access for active games. VCLoL is replay-based (.rofl upload after the fact). Mimicking live features creates expectations VCLoL cannot fulfill.

### 3.4 Do NOT Show ELO on Scrim Match Cards

WHY NOT: Per PRD v3.1, scrims do not count ELO. The current MatchDetail.tsx still renders EloDelta. This must be removed for scrim matches. Only tournament/event matches should show ELO changes.

### 3.5 Do NOT Use Bento Grid for Match List

WHY NOT: The existing UI/UX research doc correctly identifies this: match lists are chronological and should use vertical card lists. Bento grids work for dashboards (multiple data types in one view) but NOT for sequential, same-type data. ESPN, OP.GG, U.GG, Tracker.gg all use vertical lists for match history.

### 3.6 Do NOT Add Sortable Columns to the Public Match Detail Table

WHY NOT: ESPN's box score table is read-only. OP.GG's expanded match detail is read-only. 10 players in a single match is not enough data to make sorting useful. Sorting belongs on AGGREGATE views (leaderboards, player lists) not individual match detail. Adding sort to a 10-row table adds interaction complexity with zero information value.

---

## 4. Specific Match List and Match Detail Page Recommendations

### 4.1 Match List Page -- Final Recommendation

```
+----------------------------------------------------------+
| [SCRIM]  VancouverStorm  1 - 0  PacificRift    Mar 27   |
|          32:14                                           |
|  [champ][champ][champ][champ][champ]                     |
|  [champ][champ][champ][champ][champ]                     |
+----------------------------------------------------------+
```

**Card anatomy (mobile-first):**
- Row 1: Match type badge | Team A name | Score | Team B name | Date
- Row 2: Duration (muted text)
- Row 3-4: Champion composition icons (5 per team, 20px each)
- Card background: neutral on /matches global view. When viewed in team context, blue tint for win / red tint for loss.

**Interaction:**
- Entire card is clickable (link to /matches/:id)
- Hover: subtle elevation + border accent (already implemented)
- No expand/collapse on the list page -- click through to detail

**Filters (keep current, enhance):**
- Search by team name (exists)
- Filter by team (exists via select)
- Sort newest/oldest (exists)
- ADD: Filter by match type (Scrim / Tournament / Event)
- ADD: Filter by date range (this week / this month / all time)

**Pagination:**
- Current implementation loads all matches at once. Should use cursor-based pagination with infinite scroll for mobile, paginated for desktop (per existing research recommendation).

### 4.2 Match Detail Page -- Final Recommendation

**Section 1: Score Centerpiece**
```
                 < Matches

   VancouverStorm    1 - 0    PacificRift
      [VCS]                      [PR]
       WIN                      LOSS

   32:14  |  SCRIM  |  Patch 14.6  |  Mar 27, 2026
```
- Score: text-5xl font-bold, centered
- Winner: primary accent color
- Loser: muted text color
- Context badges: small, muted, horizontal row below score
- Team names link to team profiles

**Section 2: Player Stats (Two Teams)**

Blue Side (Team A):
```
+------------------------------------------------------------+
| VancouverStorm (WIN)                          Team Totals  |
|------------------------------------------------------------|
| Pos | Player       | Champ | K/D/A    | CS  | Gold | Dmg  |
|-----|-------------|-------|----------|-----|------|------|
| TOP | xiNe#NA1    | Yone  | 8/2/11   | 234 | 14.2k| 28.1k|
|     |             |  [items row]                           |
| JG  | player2     | Vi    | 3/4/15   | 156 | 10.1k| 15.3k|
|     |             |  [items row]                           |
| ... |             |       |          |     |      |      |
|------------------------------------------------------------|
|     | TEAM TOTAL  |       | 28/15/62 | 892 | 62.1k|108.5k|
+------------------------------------------------------------+
```

Red Side (Team B): same structure, red accent header

**Mobile layout for player stats:**
Instead of a table, each player becomes a stacked card:
```
+--------------------------------+
| [Champion Icon]  xiNe#NA1  TOP |
| 8/2/11  KDA 4.75              |
| CS 234  Gold 14.2k  Dmg 28.1k |
| [item][item][item][item][item] |
+--------------------------------+
```
Stacked vertically. Blue side players first, divider, red side players.

**Section 3: VODs** (when available, keep current implementation)

**Section 4: Match Visibility** (captain only, keep current implementation but remove ELO delta for scrims)

**Section 5: VCLoL Explainer** (non-logged-in only)
- Collapsed by default: single-line "What is VCLoL? >" link
- Expands to current explainer content on click
- Dismissable, stored in localStorage

### 4.3 Data Field Priority Matrix

Fields ranked by importance for each context:

**Match list card (show all):**
1. Teams (names)
2. Score/result
3. Match type
4. Date
5. Duration
6. Champion composition (10 icons)

**Match detail header (show all):**
1. Teams + score
2. Winner indicator
3. Duration
4. Match type
5. Patch version
6. Event/season (if applicable)

**Match detail player row (desktop -- show all):**
1. Position (TOP/JG/MID/ADC/SUP)
2. Player name (linked to profile)
3. Champion (icon + name)
4. KDA (colored: kills green, deaths red, assists blue)
5. CS (lane + neutral combined)
6. Gold (k format)
7. Damage to champions (k format)
8. Vision score
9. Items (icon row)
10. VOD link (if available)

**Match detail player row (mobile -- show primary, hide secondary):**
Primary (always show): Champion, Player name, KDA, CS, Items
Secondary (hidden, in expandable section): Gold, Damage, Vision, Position

---

## 5. Comparison with Existing UI_UX_RESEARCH_2025.md

### Where the Blog Research Was Correct:
1. "Match list: use cards" -- confirmed by all platforms
2. "Win/Loss: blue (win) / red (loss)" -- confirmed (OP.GG, ESPN). Blue/red avoids colorblind issues.
3. "Progressive disclosure: summary then click for detail" -- confirmed by OP.GG's collapsed/expanded pattern, ESPN's score-first approach
4. "Sticky header on match detail" -- confirmed by ESPN's fixed score bug, OP.GG's sticky team headers
5. "Skeleton screens for loading" -- confirmed as industry standard
6. "Tables for comparison data, cards for browsing" -- confirmed by all platforms
7. "Dark mode default for gaming platforms" -- confirmed universally

### Where the Blog Research Was Incomplete or Wrong:
1. **Blog said "Accordion/Expandable Rows" for match list** -- in practice, OP.GG does inline expansion BUT most users click through to a full detail page. The expandable row is a secondary interaction. VCLoL should focus on the click-through pattern, not inline expansion.

2. **Blog said "Hover tooltips for KDA breakdown"** -- in practice, OP.GG shows full K/D/A inline (not in tooltip). Tooltips are used for item descriptions, not for primary stat fields. KDA is too important to hide behind hover.

3. **Blog said "Limit to 5-7 key metrics visible"** -- this is correct for dashboards but WRONG for match detail pages. A match detail page shows 10 players x 8+ columns = 80+ data points. This is expected and accepted because the user CHOSE to drill in. The limit applies to summary/list views, not detail views.

4. **Blog missed champion composition on match cards entirely** -- this is the most impactful missing element. Every LoL stats platform shows champion icons on match cards. VCLoL must do this.

5. **Blog said "Bento grid for team profile Overview tab"** -- this is reasonable for the overview tab but should NOT be used for the matches sub-tab. Confirmed: bento for mixed-type data, vertical list for same-type sequential data.

6. **Blog missed team totals row** -- ESPN and OP.GG both show team aggregate totals at the bottom of each team's stats section. This is important for quick team-level comparison without mentally summing columns.

### What the Actual Platforms Reveal That Blogs Missed:

1. **The 10-champion composition is as important as the score.** It is the "what happened?" complement to "who won?" Every LoL platform shows it prominently.

2. **KDA RATIO (single number) is the primary performance indicator**, not the K/D/A breakdown. OP.GG shows the ratio prominently with color coding. The breakdown is secondary.

3. **MVP/ACE badges add evaluative context** that raw numbers cannot. They transform data from "here are numbers" to "here is performance context."

4. **Ghost/skeleton restricted content is better than blank space.** Show the structure of what is behind the privacy gate, not just a "private" message.

5. **Team totals row is essential** for comparing team performance at a glance.

6. **Kill participation percentage** is shown on every OP.GG match card. It is a compact indicator of team contribution that VCLoL should consider.

---

## 6. VCLoL-Specific Design Constraints

### Privacy Creates Unique Display States

VCLoL has 3 visibility states that no studied platform has:

| State | What to Show | Inspiration |
|-------|-------------|-------------|
| Public (tournament) | Everything. Full stats, all players. | OP.GG match detail |
| Logged-in participant (scrim) | Everything. Highlight own row. | OP.GG summoner match detail |
| Non-participant (scrim) | Score + teams only. Ghost table. | ESPN paywall preview |
| Private (captain override) | Score + teams + "Private" badge. No ghost table. | "Content not available" pattern |

### No Solo Queue Context

OP.GG and U.GG have rank/tier context. VCLoL does not. This means:
- No rank badge beside player names
- Team W/L record and match type must do the work that rank does on OP.GG
- Champion pick history becomes more important as a scouting signal

### Team-Centric, Not Player-Centric

OP.GG is player-first. VCLoL is team-first. Match cards should lead with team identity, not individual player performance. This is confirmed by the PRD: "Team ELO, not player ELO."

---

## Sources

### Direct Platform Analysis
- [OP.GG](https://op.gg/) -- Direct analysis
- [U.GG](https://u.gg/) -- Direct analysis
- [Tracker.gg](https://tracker.gg/) -- Direct analysis

### Official Documentation
- [OP.GG Help: Viewing Detailed Match Data](https://help.op.gg/hc/en-us/articles/31091817743129-Viewing-detailed-match-data)
- [OP.GG Help: OP Score Explained](https://help.op.gg/hc/en-us/articles/31088715328665-What-is-OP-Score)
- [OP.GG Help: KDA Calculation](https://help.op.gg/hc/en-us/articles/30993984823705-KDA-calculation-explained)

### Design Analysis & UX Research
- [A Better NBA Box Score -- Glenn McComb](https://glennmccomb.com/articles/a-better-nba-box-score/)
- [Dashboard UX Patterns -- Pencil & Paper](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards)
- [Dashboard UX Design Best Practices -- Lazarev Agency](https://www.lazarev.agency/articles/dashboard-ux-design)
- [Bloomberg Terminal UX: Concealing Complexity](https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/)
- [Stripe Payment UX Gold Standard](https://www.illustration.app/blog/stripe-payment-ux-gold-standard)
- [ESPN Web Redesign Analysis](https://info.keylimeinteractive.com/espn-web-redesign-evokes-the-roar-of-the-crowd-but-are-they-cheering)
- [Score Bugs and the UX of Sports -- Medium](https://medium.com/@alainazemanick/take-me-out-to-the-ballgame-score-bugs-and-the-ux-of-americas-pastime-27b83ae175b1)

### OP.GG Comparison & Analysis
- [What is OP.GG -- HappySmurf](https://happysmurf.com/blog/what-is-opgg/)
- [OP.GG vs Mobalytics](https://mobalytics.gg/opgg-vs-mobalytics/)
- [OP.GG Summoner Page Design -- Dribbble](https://dribbble.com/shots/4052189-OP-GG-Summoner-page)

### Tracker.gg
- [Tracker.gg XP, Challenges, Awards](https://tracker.gg/articles/introducing-tracker-xp-challenges-and-awards)
- [Valorant Advanced Match Filters](https://tracker.gg/articles/valorant-advanced-match-filters-now-available)
