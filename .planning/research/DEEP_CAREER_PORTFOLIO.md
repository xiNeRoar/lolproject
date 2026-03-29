# Deep UX Research: Verified Competitive Record as Career Portfolio

**Domain:** Career portfolio / verified credential display for amateur esports
**Researched:** 2026-03-28
**Overall Confidence:** MEDIUM-HIGH (primary platforms studied directly; scout workflow data from multiple credible sources)

---

## 1. Platform-by-Platform Analysis

### 1.1 LinkedIn -- The Professional Career Standard

**What they actually show (profile page, top to bottom):**

1. **Hero card** (above the fold): Profile photo, background image, name, headline (220 chars), location, follower count, action buttons (Message, Connect)
2. **About section**: 2-3 paragraph narrative summary
3. **Featured content**: Pinned articles, media, links
4. **Activity feed**: Recent posts with engagement metrics
5. **Experience**: Reverse-chronological job entries with company, title, dates, bullet-point accomplishments
6. **Education**: Institution, degree, dates
7. **Skills & Endorsements**: Up to 50 skills, each with endorsement count
8. **Recommendations**: Written testimonials from colleagues

**Why this hierarchy (what problem it solves):**

The information hierarchy follows the recruiter's 7.4-second scanning pattern:
- Second 1-2: Headline test ("What does this person do?")
- Second 3-4: Relevance test ("Right level/industry?")
- Second 5-6: Keyword test ("Skills I searched for?")
- Second 7: Credibility test ("Worth opening?")

The hero card does 90% of the work. Recruiters make their open/skip decision based on the headline and most recent role alone. Everything below is for the 30% who scroll.

**Who is the intended viewer:**

Two distinct audiences served by the same page:
- **Recruiters** (scouts): Scan headline, check experience keywords, skim endorsements. Need to answer "Can this person do the job?" in under 10 seconds.
- **Network connections**: Read activity, engage with posts. Different engagement pattern entirely.

LinkedIn solves for the recruiter-first because that is the conversion that generates revenue.

**When the user interacts:**

- Setup: One-time heavy investment (~45 minutes to fill profile)
- Maintenance: Ongoing but lightweight -- add new roles, post content
- The profile is NOT a living document; it is a snapshot with periodic updates

**Where in the flow:**

Entry point for external search (Google, LinkedIn Search). Destination for inbound connection. The profile is always a landing page, never a starting page.

**How they handle new user vs veteran:**

- **New user**: Profile completeness meter (progress bar). "All-Star" badge for complete profiles. LinkedIn explicitly gamifies profile completion because incomplete profiles are 40x less likely to receive opportunities. The progress bar + rewards loop drives completion.
- **Veteran with tons of data**: No compression problem because the format is inherently bounded. You have N jobs. Each shows title, company, dates. The page grows linearly but never becomes overwhelming because each entry is a contained card.

**Critical insight for VCLoL:**

LinkedIn's single most powerful pattern is the **headline** -- a 220-character summary that appears in every search result, every comment, every message. It is the single line that does all the selling. VCLoL's player profile has no equivalent. The RiotId alone does nothing for a scout scanning a list.

---

### 1.2 GitHub -- The Developer Body of Work

**What they actually show (profile page, top to bottom):**

1. **Identity bar**: Avatar, username, follower/following count, location, affiliation
2. **Profile README** (if exists): Custom markdown content at top of profile
3. **Achievement badges**: Visual badges (Arctic Code Vault, Pull Shark, Starstruck, etc.)
4. **Pinned repositories** (up to 6): Card per repo showing name, description, language, star count, fork count
5. **Contribution graph**: 52-week grid of green squares showing daily commit activity
6. **Contribution activity**: Chronological feed of recent commits, PRs, issues

**Why this hierarchy:**

GitHub makes one bet: the contribution graph IS the credibility signal. A developer who has consistent green squares over 12 months is, at a glance, someone who codes regularly. The pinned repos are the curated "best of" -- max 6, deliberately limited to force curation.

The README sits above everything because it is the only freeform space. Developers who invest in their README signal that they care about presentation, not just code.

**Who is the intended viewer:**

- **Tech hiring managers** (83% trust GitHub more than resumes per Beamery 2025 study): Check pinned repos, glance at contribution graph, read README if it exists. Most do NOT click into repos.
- **Open-source collaborators**: Browse repos, check contribution history, evaluate code quality.

**How they handle new user vs veteran:**

- **New user**: Empty contribution graph (all gray). No pinned repos. The profile looks visibly empty, which is both honest and motivating. GitHub does NOT hide the emptiness -- it is a signal.
- **Veteran (Linus Torvalds)**: 5 pinned repos, 293k followers, achievement badges (Mars 2020 Contributor, Arctic Code Vault). The page is dense but bounded because pinned repos cap at 6 and the contribution graph is always the same 52-week width.

**Critical insights for VCLoL:**

1. **Contribution graph = activity heatmap.** VCLoL's Design Guide already specifies an activity heatmap. This is the right call. GitHub proved that a visual grid of activity over time is the single most powerful "at a glance" credibility signal.

2. **Pinned repos = curated highlights.** GitHub forces 6 max. VCLoL equivalent: let players "pin" 3-5 of their best matches or tournament results to the top of their profile. Most impressive performances first.

3. **README = narrative space.** GitHub gives developers one place for freeform expression. VCLoL should consider a brief "player statement" or "About" section (50-150 words) where players can describe their competitive goals, preferred role, team-seeking status. This is what LinkedIn's headline does and what OP.GG completely lacks.

---

### 1.3 Behance / Dribbble -- The Visual Portfolio

**What they actually show:**

**Behance project page:**
1. **Project grid**: Uniformly sized thumbnails (808x632px) in a masonry/grid layout
2. **Per-project metadata**: Title, tools used, view count, appreciation count
3. **Project detail (click-through)**: Full-width scrollable case study at 1400px width, mixing images and brief text (Behance explicitly discourages more than 2-3 lines of text per section)

**Dribbble profile:**
1. **Shot grid**: Uniform square/rectangular thumbnails
2. **Per-shot metadata**: Like count, view count, save count
3. **Pro badge**: Verified professional status

**Why this hierarchy:**

Portfolio platforms solve a fundamentally different problem than career platforms: they must demonstrate quality of output, not just credentials. The grid of thumbnails IS the evaluation -- a hiring manager scanning 50 portfolios spends 5 seconds deciding whether to click into any one.

**The 5-stage recruiter evaluation flow (verified via OpenDoors Careers research):**
1. Pre-click decision (should I even open this?)
2. Visual craft assessment (within seconds -- spacing, typography, polish)
3. Hero section scan (what do they claim to be?)
4. Work preview evaluation (are the project titles meaningful?)
5. About page deep dive (only if work impressed)

**Critical insights for VCLoL:**

1. **The thumbnail IS the evaluation.** For match results, this means the match card in a list view must communicate quality instantly: Team A vs Team B, decisive score, player's champion + KDA. The scout does not click in unless the card looks interesting.

2. **Case study structure = match detail.** Behance projects follow: Problem, Process, Solution, Outcome. VCLoL match detail should follow: Context (teams, event, stakes), Performance (stats table), Outcome (W/L, MVP), Evidence (VOD link). This is the "verified case study" of competitive play.

3. **Uniform presentation.** Behance's grid works because every project card is the same size and structure. VCLoL match history should have identical card structure for every match -- never varying the layout. Consistency enables scanning.

4. **Quality over quantity.** Dribbble's strongest signal is that a portfolio with 8 excellent shots beats one with 80 mediocre ones. VCLoL should consider a "featured matches" section where the player curates their best performances, rather than showing everything by default.

---

### 1.4 OP.GG / U.GG -- The Gaming Stats Standard

**What OP.GG actually shows (profile page, top to bottom):**

1. **Identity bar**: Summoner name, level icon, region, ladder rank ("1,087 - top 0.0493%")
2. **Ranked medal**: Large visual showing current tier (Master, Diamond, etc.) + LP + W/L + win rate
3. **Navigation tabs**: Summary | Champions | Highlights | Mastery | Live Game
4. **Season tier history**: Table showing ranked progression across seasons
5. **Champion mastery**: Top champions with mastery level badges and point totals
6. **Recent performance table**: Last 7 days -- champions played, W/L per champion, win rate
7. **Match history**: Chronological list of recent matches with champion, KDA, items, result
8. **Queue type filter**: All | Ranked Solo/Duo | Ranked Flex | ARAM

**What U.GG adds:**
- LP per game tracking (unique metric)
- Year-in-review summary feature
- "Next Up" layout showing progression toward next rank

**Why this hierarchy:**

OP.GG serves solo queue players checking their own stats and opponents' stats. The primary question is "How good is this player RIGHT NOW?" -- hence ranked tier dominates the page. Everything is organized around recency: current season, recent 7 days, recent matches.

**Who is the viewer:**

- **The player themselves** (80%+ of traffic): "How did I do? What is my win rate? Am I climbing?"
- **Opponents in loading screen**: "What does this guy play? Should I ban his main?"
- **NOT scouts** (no team play data, no team history, no organized competition records)

**What OP.GG does NOT show (and VCLoL must):**

| Data Point | OP.GG | VCLoL Must Have |
|---|---|---|
| Team history | None | Full per-team career resume |
| Team W/L | None | Per-team win/loss record |
| Organized match results | None (solo queue only) | .rofl-verified scrim/tournament results |
| Role within team context | None | Role played on each team |
| Teammate performance | None (individual only) | 10-player match stats |
| VODs | None | Spectator + POV recordings |
| Player statement / bio | None | Optional player description |
| Verification status | None | RSO-verified badge |
| Activity consistency | None | Activity heatmap |

**Critical insights for VCLoL:**

1. **OP.GG is an anti-pattern for VCLoL's goals.** OP.GG answers "How good is this player at solo queue?" VCLoL must answer "How good is this player in organized team play?" These are fundamentally different questions requiring different data hierarchies.

2. **Ranked tier is irrelevant to VCLoL.** OP.GG puts the ranked medal as the largest visual element. VCLoL should NOT prominently display solo queue rank. The equivalent of "ranked tier" in VCLoL is the team play resume: total organized games, win rate in scrims, tournament results. This is the credential.

3. **Champion pool display is transferable.** OP.GG's champion mastery section (champion portrait + games played + win rate) works well and should be adopted, but scoped to organized play. "Orianna: 47 organized games, 62% WR, 4.2 KDA" is vastly more valuable to a scout than "Orianna: 247 mastery points."

4. **Match history format is useful but insufficient.** OP.GG's match cards (champion, KDA, items, W/L) are good but show only individual performance. VCLoL match cards must show the team context: opponent team name, match type (scrim/tournament), score, and THEN individual performance.

5. **Privacy controls are weak.** OP.GG has basic public/private toggle. VCLoL's 3-layer privacy model (scrim private, RSO opt-in, tournament public) is far more sophisticated and Riot-compliant. This is a genuine differentiator.

---

## 2. What VCLoL Should Adopt and WHY

### 2.1 The LinkedIn Headline Pattern: Player Summary Line

**What:** A 1-2 line summary that appears wherever the player's name appears in search results, team rosters, and match cards.

**Why for VCLoL:** When a scout searches for "mid laners with 50+ games," the search results list needs to communicate value immediately. Currently VCLoL would show: "xiNe#NA1 | 67 games | 58% WR" -- but this lacks context. A summary line would show: "xiNe#NA1 | Mid | VancouverStorm [VCS] | 67 organized games | 58% WR"

**5W1H:**
- **What**: Auto-generated summary line from player data (primary role, current team, game count, win rate)
- **Why**: Scout scanning optimization -- the 7-second evaluation problem applies to esports scouting too
- **Who**: Serves scouts and coaches scanning player lists
- **When**: Auto-generated from data, no player action needed
- **Where**: Search results, player list page, team roster displays, match player rows
- **How**: Computed server-side from player stats. No manual input required. Players can optionally add a short bio (50-150 chars).

### 2.2 The GitHub Activity Heatmap

**What:** A 52-week grid showing match frequency over time.

**Why for VCLoL:** GitHub proved that consistent activity is the strongest trust signal for evaluators. A heatmap showing regular scrims over 6 months communicates "this player is dedicated and active" far more effectively than a number ("67 games played"). Scouts explicitly evaluate consistency and training discipline.

**5W1H:**
- **What**: Grid of colored squares, one per day, showing match count
- **Why**: Visual proof of consistent competitive activity -- the #1 thing scouts evaluate beyond skill
- **Who**: Serves scouts (primary), the player themselves (secondary)
- **When**: Always visible on profile, auto-populated from match dates
- **Where**: Player profile page, above match history
- **How**: Compute from match_players join matches, group by date. Already specified in DESIGN_GUIDE.md.

### 2.3 The GitHub Pinned Repos Pattern: Featured Matches

**What:** Allow players to pin 3-5 of their best matches to the top of their profile.

**Why for VCLoL:** GitHub proved that curated highlights are more powerful than exhaustive history. A scout looking at a mid laner wants to see their best Orianna game, their tournament performance, their comeback win -- not a chronological list where the best performances are buried.

**5W1H:**
- **What**: 3-5 player-selected match cards pinned above match history
- **Why**: Curated quality > chronological quantity for evaluation
- **Who**: Player curates; scout consumes
- **When**: Player sets up once, updates occasionally
- **Where**: Player profile, between activity heatmap and full match history
- **How**: New column `is_featured` on match_players table, or separate `featured_matches` table with player_id + match_id + display_order. Max 5.

### 2.4 The Behance Case Study Pattern: Match Detail as Evidence

**What:** Structure match detail pages as verifiable case studies: Context, Performance, Outcome, Evidence.

**Why for VCLoL:** Behance proved that the strongest portfolios tell stories with structure. A match detail page that shows "VancouverStorm vs PacificRift | Season 2 Tournament | Round 3 | 32:14 | [Player stats table] | [VOD link]" is a verifiable case study of competitive performance. This is EXACTLY what scouts need to evaluate talent.

**5W1H:**
- **What**: Match detail page structured as: Event context (if any) > Teams + Score > Performance table > VOD link
- **Why**: Scouts need verifiable evidence, not just numbers
- **Who**: Scouts use for deep evaluation after initial scan
- **When**: Accessed via match card click from player profile or match list
- **Where**: /matches/:id page
- **How**: Already built. Enhancement: add event context banner if match is part of an event. Add "Verified via .rofl" badge.

### 2.5 The LinkedIn Verification Pattern: RSO Verified Badge

**What:** A visible, prominent verification badge on verified player profiles.

**Why for VCLoL:** LinkedIn's verification badge (blue check) increases profile visibility and trust in search results. VCLoL's RSO verification is actually STRONGER than LinkedIn's -- it is cryptographic identity verification via Riot's OAuth, not just email/phone verification. This should be prominently displayed because it is the core differentiator: "This competitive record cannot be faked."

**5W1H:**
- **What**: Small badge icon next to player name wherever it appears (profile, search results, match cards, team rosters)
- **Why**: Zero impersonation tolerance is VCLoL's core promise. The badge makes it visible.
- **Who**: Every viewer benefits from knowing a profile is verified
- **When**: Appears automatically after RSO verification
- **Where**: Everywhere the player name appears
- **How**: Check `players.rsoOptIn` or `players.puuid IS NOT NULL`. Display a small shield/check icon.

### 2.6 LinkedIn Profile Completeness for Empty Profiles

**What:** Progress meter showing profile completeness for new/incomplete profiles.

**Why for VCLoL:** LinkedIn's completeness meter drives profile completion because complete profiles are 40x more likely to receive opportunities. VCLoL faces the same cold-start problem: a player with no RSO, no matches, and no team has an empty profile. A progress meter ("3 of 5 steps complete") with clear next actions drives activation.

**5W1H:**
- **What**: Checklist with progress bar on player dashboard: Connect RSO, Join team, Play 1 match, Play 5 matches, Set profile to public
- **Why**: Drives activation; empty profiles have no value for anyone
- **Who**: New players see this on their dashboard
- **When**: Dashboard view until all steps complete
- **Where**: Player dashboard, above recent matches
- **How**: Compute from player data: has puuid? has team? match count > 0? match count >= 5? profileVisibility != 'private'?

---

## 3. What VCLoL Should NOT Adopt and WHY

### 3.1 LinkedIn's Endorsement/Recommendation System

**Why not:** Endorsements work for generic skills ("JavaScript", "Project Management") but are meaningless for esports. A teammate endorsing "good mid laner" adds nothing -- the match data already proves it. Verified .rofl data is a stronger signal than any subjective endorsement.

**What to do instead:** Let the data speak. Win rate, KDA, champion pool diversity, tournament results are all objective and verifiable. Subjective endorsements would dilute the "verified record" value proposition.

### 3.2 OP.GG's Solo Queue Rank Display

**Why not:** Solo queue rank is irrelevant to organized team play performance. A Diamond 2 player might be a Challenger-level team player, or a Masters player might tilt in organized scrims. VCLoL's entire value proposition is that it measures something DIFFERENT from solo queue stats.

**What to do instead:** Show organized play metrics: total team games, win rate in scrims, tournament record. These are the credentials that matter for team play evaluation.

### 3.3 GitHub's Uncapped Repository List

**Why not:** GitHub shows ALL repos by default, and most profiles are cluttered with half-finished experiments and forked tutorials. VCLoL should not show every match by default to scouts -- a player's 50-game match history is overwhelming. Default to the summary view with featured matches.

**What to do instead:** Show the activity heatmap + featured matches + recent 5 matches on the profile page. Full match history behind a "View all matches" link or tab.

### 3.4 Behance's Freeform Project Layout

**Why not:** Behance allows unlimited-height scrolling case studies with custom layouts per project. This is appropriate for creative work where each project is unique. Match data is structured and uniform -- using the same layout for every match enables scanning and comparison.

**What to do instead:** Uniform match card structure. Same fields, same layout, every match. Consistency enables the scanning pattern that scouts need.

### 3.5 Dribbble's Like/Save Social Mechanics

**Why not:** Social engagement metrics (likes, saves, views) are vanity metrics that do not correlate with competitive ability. A player's match going "viral" tells you nothing about their skill. VCLoL should resist the temptation to add social features that distract from the verified record.

**What to do instead:** Focus on intrinsic metrics: win rate, KDA, consistency, tournament results. The only social proof that matters is badges earned through performance (Veteran, Win Streak, Season Champion).

---

## 4. Comparison with Existing Research (docs/UI_UX_RESEARCH_2025.md)

### 4.1 Where Existing Research is Accurate

| Topic | Existing Research Says | Platform Reality Confirms |
|---|---|---|
| Reverse chronological career timeline | "Universally preferred for mid-to-senior professionals" | LinkedIn, GitHub, Behance all use reverse chronological. Confirmed. |
| Per-team card-based display | "Each team gets its own card with: team logo, name, dates, W/L, KDA" | LinkedIn experience entries follow this pattern. Already implemented in PlayerProfile.tsx. Confirmed. |
| Privacy states | "Default private with clear opt-in flow" | LinkedIn and OP.GG both offer public/private toggles. VCLoL's 3-layer model is more sophisticated than either. Confirmed and exceeded. |
| Progressive disclosure | "Summary -> click for detail" | All four platforms use this pattern. Confirmed. |
| Card vs table hybrid | "Cards for browsing, tables for comparison" | OP.GG uses cards for match list, tables for match detail. Confirmed. |

### 4.2 Where Existing Research is Incomplete or Wrong

| Topic | Existing Research Says | Platform Reality Shows | Gap |
|---|---|---|---|
| Career narrative | "Timeline resumes present career history" | LinkedIn's headline does more work than the timeline. The 1-line summary is the most powerful element. | **VCLoL has no player summary line.** The player profile header shows name, team links, W/L, KDA -- but no synthesized "headline" that communicates value at a glance. |
| Activity visualization | Not mentioned in Section 2 | GitHub's contribution graph is the single most trusted signal by hiring managers (83% trust it over resumes). | **Activity heatmap is in DESIGN_GUIDE.md but not yet built.** This is a critical gap. |
| Curated highlights | "Comparison view: ability to compare metrics across projects/periods" | GitHub's pinned repos and Dribbble's top shots show that curation (choosing your best work) is more valuable than comparison. | **VCLoL has no "featured matches" concept.** Players cannot curate their best performances. |
| Empty state progression | Section 7 covers empty states well | LinkedIn's profile completeness meter is specifically gamified to drive completion (progress bar + "All-Star" badge). | **VCLoL's empty state design is reactive (showing messages) rather than proactive (driving completion).** Dashboard checklist exists but no completeness meter. |
| Scout-specific needs | Section 2.1 mentions "Scouts, Coaches, NACL Team Managers" as S4 stakeholder | Real scouting involves: (1) ranked stats for initial filter, (2) custom metrics for weakness analysis, (3) VOD review for qualitative assessment, (4) scrim performance evaluation, (5) interview/trial. VCLoL needs to serve steps 2-4. | **VCLoL's player profile is player-centric, not scout-centric.** No "scouting report" view exists. |
| Verification as trust signal | "Badge/icon showing current privacy state" | LinkedIn verification badge and GitHub's achievement system show that trust signals must be PROMINENT, not subtle. 72% of employers prefer candidates with verified credentials. | **RSO verification badge exists but is not prominently displayed across the platform.** |
| Shareable format | "Shareable Card" in DESIGN_GUIDE.md | Real platforms show that shareability is about the search result / embed preview, not a screenshot card. LinkedIn's value is that you share a URL and the recipient sees a rich preview. | **VCLoL should prioritize OG/meta tags for rich link previews over screenshot-optimized cards.** |

### 4.3 Where Existing Research Correctly Identifies Patterns but Misattributes Sources

The existing research (Section 2) cites Read.cv and Polywork as career portfolio examples. While these are real platforms, they serve niche creative audiences. The patterns they use (curated projects, wall of updates) are actually derived from LinkedIn and Behance respectively. The existing research correctly identifies the patterns but attributes them to secondary sources.

For VCLoL specifically, LinkedIn and GitHub are far more relevant models than Read.cv or Polywork because:
- VCLoL's audience (scouts, coaches) behaves like LinkedIn recruiters, not design clients
- VCLoL's data (verified match results) behaves like GitHub contributions (objective, timestamped, verifiable), not creative portfolios (subjective, curated)

---

## 5. Specific Recommendations with 5W1H Justification

### 5.1 PRIORITY 1: Auto-Generated Player Summary Line

**What:** Server-computed 1-line summary: `{Role} | {Current Team} [{Tag}] | {Total Games} organized games | {Win Rate}% WR`

Example: `Mid | VancouverStorm [VCS] | 67 organized games | 58% WR`

**Why:** This single line solves the scout's 7-second evaluation problem. When scanning a list of 50 players, this line tells the scout everything they need to decide whether to click through. Without it, VCLoL's player search is a list of Riot IDs that mean nothing to an evaluator.

**Who benefits:** Scouts (primary), other players evaluating potential teammates (secondary).

**When:** Computed on every profile view from aggregate stats. No player action required.

**Where:** Player search results, team roster displays, match player rows, player profile header.

**How:** SQL query joining match_players, team_members, and players. Compute primary role from most-played role in match_players. Compute games/WR from match_players aggregate. Assemble string. Cache in player record or compute on read.

**Complexity:** Low. Data already exists. This is a display-layer change.

### 5.2 PRIORITY 2: Build the Activity Heatmap

**What:** 52-week grid (GitHub contribution graph style) showing match frequency per day.

**Why:** GitHub proved this is the strongest visual trust signal for evaluators. A green-filled grid says "this player practices consistently" more powerfully than any number. Scouts explicitly evaluate training discipline and consistency.

**Who benefits:** Scouts evaluating dedication, players seeing their own activity patterns.

**When:** Always visible on player profile, populated automatically from match dates.

**Where:** Player profile page, between the header card and career history section.

**How:** Already specified in DESIGN_GUIDE.md with exact implementation details. Query match_players joined with matches grouped by date. Render as pure div grid with Tooltip on hover.

**Complexity:** Medium. Frontend component + API endpoint for player match dates.

### 5.3 PRIORITY 3: Featured Matches (Pinned Highlights)

**What:** Player can pin 3-5 matches to the top of their profile as "highlight" performances.

**Why:** GitHub's pinned repos pattern proves curated quality beats exhaustive history. A scout seeing a player's best tournament performance pinned at the top of their profile is immediately drawn in. Without this, the best performances are buried in chronological match history.

**Who benefits:** Players showcasing their best work, scouts finding impressive performances quickly.

**When:** Player sets up manually through profile settings. Updates as desired.

**Where:** Player profile page, between activity heatmap and full match history/career history.

**How:** New `featured_matches` table (player_id, match_id, display_order, created_at) or a `is_featured` boolean + `feature_order` on match_players. API endpoint to set/unset featured status. Max 5 per player.

**Complexity:** Medium. New table, new API endpoints, new UI section on profile.

### 5.4 PRIORITY 4: Scouting Report View (Scout-Optimized Profile)

**What:** An alternative view of the player profile optimized for scout evaluation needs, accessible via query param or tab.

**Why:** Scouts need different information than players. A scout evaluating a mid laner wants: champion pool depth (how many champions with 10+ games and >50% WR), consistency metrics (activity heatmap density), team performance comparison (did they perform better on Team A or Team B?), and VOD links. This is fundamentally different from the player's self-view.

**Scout evaluation checklist (from LoL analyst research):**
1. Champion pool size (diversity vs one-trick)
2. Performance consistency (low variance in KDA across matches)
3. Team play record (organized games, not solo queue)
4. Improvement trajectory (getting better over time?)
5. Communication and attitude (only from VODs/trials)

**Who benefits:** Scouts, coaches, NACL team managers (S4 stakeholder).

**When:** Accessible anytime; most useful when scout is actively evaluating candidates.

**Where:** /players/:riotId?view=scout or a "Scouting Report" tab on player profile.

**How:** Same data, different presentation. Emphasize: champion pool with depth metrics, consistency chart (KDA variance over time), activity heatmap, team comparison cards, VOD links. De-emphasize: badges, event history, ELO trajectory.

**Complexity:** High. Requires new computed metrics (champion depth, consistency), new UI layout, and careful data aggregation. Defer to later phase.

### 5.5 PRIORITY 5: RSO Verification Badge Everywhere

**What:** Small shield/checkmark icon next to every instance of a verified player's name across the entire platform.

**Why:** VCLoL's core value proposition is "verified competitive record that cannot be faked." The RSO verification is cryptographic proof of identity via Riot's OAuth. This is stronger verification than LinkedIn's blue check. Yet currently, verification status is only visible on the profile page. It should appear EVERYWHERE the name appears: search results, match cards, team rosters, match detail player rows.

**Who benefits:** Everyone. Every viewer benefits from knowing a record is verified.

**When:** Automatically after RSO verification.

**Where:** Literally everywhere a player name renders: search results, match cards, team roster, match detail, leaderboard.

**How:** Small React component (VerifiedBadge) that checks rsoOptIn/puuid and renders a small icon. Apply wherever PlayerName component is used.

**Complexity:** Low. UI component + prop threading. Data already exists.

### 5.6 PRIORITY 6: Profile Completeness Meter (New Player Activation)

**What:** Progress bar + checklist on new player dashboard showing profile completion status.

Steps:
1. Create account (auto-complete)
2. Verify identity via RSO
3. Join a team
4. Play your first match
5. Play 5 matches
6. Set profile to public (optional, shown as bonus)

**Why:** LinkedIn's data shows complete profiles are 40x more likely to receive opportunities. VCLoL faces the same cold-start problem. Without guidance, new players create accounts and then have empty profiles that are useless to everyone.

**Who benefits:** New players (get activated faster), the platform (more complete profiles = more value for scouts).

**When:** Visible on dashboard until all steps complete. Dismissable after step 4 (core completion).

**Where:** Player dashboard, top of page.

**How:** Compute completion from player data (puuid, team_members, match_players count, profileVisibility). Already partially exists as captain onboarding checklist. Extend to all players.

**Complexity:** Low-Medium. Logic exists. Need UI component and computation.

---

## 6. Information Hierarchy Recommendation for VCLoL Player Profile

Based on cross-platform analysis, the recommended player profile hierarchy (top to bottom):

### Above the Fold (The 7-Second Zone)

1. **Hero card**: Player avatar (first letter or champion portrait) + Riot ID + RSO Verified badge + auto-summary line + teams (linked) + overall W/L + overall KDA + win rate
2. **Badges row**: Earned badges (Veteran, Win Streak, Season Champion) -- compact, horizontal

### First Scroll (The Evaluation Zone)

3. **Activity heatmap**: 52-week contribution graph -- visual proof of consistency
4. **Featured matches**: 3-5 player-curated highlight performances (if set)
5. **Career history**: Per-team cards in reverse chronological order (current design is correct)

### Deep Scroll (The Deep Dive Zone)

6. **Champion pool**: Champion portraits with organized-play stats (games, WR, KDA)
7. **Recent matches**: Last 5-10 matches as cards
8. **Events**: Tournament/event participation history
9. **VODs**: Available VODs linked to matches

### Hidden/Tab (The Archive Zone)

10. **Full match history**: Behind "View All" or tab -- complete chronological list
11. **Full stats**: Detailed statistical breakdowns behind a Stats tab

---

## 7. Current PlayerProfile.tsx Gap Analysis

Comparing the current implementation against research findings:

| Section | Current State | Recommended Change | Priority |
|---|---|---|---|
| Hero card | Shows: name, teams, W/L, KDA, win rate, badges | ADD: auto-summary line, RSO verified badge. REMOVE: Discord username (not scout-relevant) | P1 |
| ELO Trajectory | Present (shows team ELO history) | REMOVE per PRD v3.1 -- ELO is team-level and tournament-only. This section is misleading on a player profile | P1 |
| Activity heatmap | Not built | BUILD -- specified in DESIGN_GUIDE.md, not yet implemented | P2 |
| Featured matches | Not built | BUILD -- new concept from this research | P3 |
| Career history | Per-team cards with W/L, KDA, join date | GOOD. Minor: add sparkline showing W/L trend per team | P4 |
| Champion pool | Champion portraits with games, WR, KDA | GOOD. Minor: add "organized play only" label to clarify this is not solo queue data | P3 |
| Recent matches | Shows match cards with champion, teams, score | GOOD. Minor: add match type badge (scrim/tournament) | P3 |
| Events | Shows event participation with W/L | GOOD. Keep. | -- |
| VODs | Shows available VODs | GOOD. Keep. | -- |
| Privacy state | Private profile shows lock icon + message | GOOD. This is correct. | -- |
| Player bio/statement | Not built | CONSIDER for future -- optional 50-150 char self-description | P5 |

---

## 8. Key Takeaway

**VCLoL is building something that does not exist in the esports ecosystem.**

LinkedIn serves professional careers. GitHub serves developer careers. OP.GG serves solo queue stats. Nobody serves organized team play resumes for amateur esports.

The closest analogues are:
- LinkedIn for information hierarchy and scout-optimization patterns
- GitHub for activity visualization and curated highlights
- Behance for structured evidence presentation
- OP.GG for gaming stats display conventions (but NOT for the career narrative pattern)

**The player profile is the product.** It is the deliverable that VCLoL provides to players. Every design decision should be evaluated against: "Does this help a scout evaluate this player's organized team play ability in under 30 seconds?"

If yes, build it. If no, defer it.

---

## Sources

### LinkedIn
- [What Recruiters Want to See in Your LinkedIn Profile - Staffing Advisors](https://www.staffingadvisors.com/blog/what-recruiters-want-to-see-in-your-linkedin-profile/)
- [LinkedIn Skills 2026: What Recruiters Actually Search - HyperClapper](https://www.hyperclapper.com/blog-posts/linkedin-skills-recruiters-search)
- [12 Steps to a Better LinkedIn Profile - LinkedIn](https://www.linkedin.com/business/sales/blog/profile-best-practices/17-steps-to-a-better-linkedin-profile-in-2017)
- [I Analyzed 1,000 LinkedIn Profiles That Got Hired in 2025 - The Interview Guys](https://blog.theinterviewguys.com/i-analyzed-1000-linkedin-profiles-that-got-hired/)
- [LinkedIn Profile Has 10 Seconds - JobSeeker Pro](https://www.jobseeker.pro/blog/10_Seconds)

### GitHub
- [What Recruiters Look For in a GitHub Profile - DEV Community](https://dev.to/hexshift/what-recruiters-look-for-in-a-github-profile-and-how-to-optimize-yours-j0e)
- [How to Use GitHub as a Developer Portfolio to Land Tech Interviews in 2025 - FinalRoundAI](https://www.finalroundai.com/articles/github-developer-portfolio)
- [GitHub Developer Portfolio Mastery 2025 - Dhakrey](https://blogs.iamdhakrey.dev/blog/github-developer-portfolio-mastery-2025)
- [Your GitHub Profile Is Your Second Resume - DEV Community](https://dev.to/matthewhou/your-github-profile-is-your-second-resume-heres-how-to-make-it-work-for-you-ala)
- [How to Find and Recruit Developers on GitHub - Recruiter Daily Dev](https://recruiter.daily.dev/resources/recruit-developers-on-github-sourcing-guide/)

### Behance / Dribbble
- [How Recruiters and Hiring Managers Actually Look at Your Portfolio - OpenDoors Careers](https://blog.opendoorscareers.com/p/how-recruiters-and-hiring-managers-actually-look-at-your-portfolio)
- [What Design Recruiters Look For in Your UI/UX Portfolio - Dribbble](https://dribbble.com/resources/career/design-recruiter-portfolio-tips)
- [Building the Perfect Case Study - Behance](https://www.behance.net/resources/articles/building-the-perfect-case-study)
- [Design Portfolio Evaluation Process as a Hiring Manager - Medium](https://medium.com/design-bootcamp/my-portfolio-evaluation-process-342005398262)

### OP.GG / U.GG / Gaming Stats
- [OP.GG](https://op.gg/) (direct platform study)
- [OP.GG Privacy Settings - Help Center](https://help.op.gg/hc/en-us/articles/31092128317721-How-to-set-profile-to-public-or-private)

### Esports Scouting
- [Player Scouting and Statistics (LoL) - iTero Gaming / Medium](https://medium.com/the-esports-analyst-club-by-itero-gaming/player-scouting-and-statistics-league-of-legends-136e481c948a)
- [How Are Esports Players Discovered - Teto Games](https://corp.tetogames.com/blog/how-are-esports-players-discovered-the-new-talent-scouting-of-the-digital-world)
- [Six Steps to Scout Esports Talent Effectively - LinkedIn](https://www.linkedin.com/advice/0/how-do-you-scout-esports-talent-effectively-skills-esports)

### Verified Credentials
- [2025: The Year the Credential Ecosystem Moved - Accredible](https://www.accredible.com/blog/2025-the-year-the-credential-ecosystem-moved)
- [Upwork Skills Certifications: How Badges Boost Profile Visibility - GigRadar](https://gigradar.io/blog/upwork-skills-certifications)

### Empty States / Onboarding
- [Empty States in SaaS Applications - Userpilot](https://userpilot.com/blog/empty-state-saas/)
- [Designing Empty States in Complex Applications - NN/g](https://www.nngroup.com/articles/empty-state-interface-design/)
