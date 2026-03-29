# Deep UX Research Synthesis

**Project:** VCLoL -- 5v5 Scrim Recording Platform
**Synthesized:** 2026-03-28
**Inputs:** DEEP_CAREER_PORTFOLIO.md, DEEP_MATCH_DATA.md, DEEP_IDENTITY_PRIVACY_TEAMS.md, DEEP_ACTIVATION_RETENTION.md
**Compared Against:** docs/UI_UX_RESEARCH_2025.md (existing research)

---

## Executive Summary

VCLoL is building something that does not exist: a verified competitive resume for amateur team play. The four deep research outputs converge on a single thesis -- **the player profile IS the product, and every UX decision must optimize for a scout evaluating a player in under 30 seconds**. Cross-industry analysis of LinkedIn, GitHub, OP.GG, ESPN, Strava, Duolingo, and Letterboxd reveals that VCLoL's activation hinges on one moment: a player seeing their own verified match stats for the first time via a Discord match link. The existing UI_UX_RESEARCH_2025.md correctly identified most surface-level patterns (cards for browsing, tables for comparison, dark mode, progressive disclosure) but missed the deeper strategic layer: the career narrative framing, the scout-optimization lens, the "show value before gate" activation pattern, and the notification-driven retention loop. The highest-impact gaps are the absence of a player summary line (LinkedIn headline equivalent), the unbuilt activity heatmap (GitHub contribution graph), the lack of champion composition on match cards (table stakes for LoL platforms), and the missing "preview as visitor" privacy feature (the single most trust-building privacy pattern across all platforms studied).

---

## VCLoL's Core UX Challenges (What the Research Revealed)

### Challenge 1: The Scout's 7-Second Problem
LinkedIn research shows recruiters spend 7.4 seconds scanning a profile before deciding to click or skip. VCLoL's player profiles currently show a Riot ID and raw stats -- no synthesized "headline" that communicates value at a glance. A scout scanning 50 players has no way to quickly evaluate who deserves a deeper look. The auto-generated summary line (role, team, games, win rate) solves this.

### Challenge 2: The Match Link Is the Product's Front Door
Activation research (Strava, Duolingo, Letterboxd) converges on one finding: the first visit must deliver value before asking for anything. VCLoL's primary entry point is a Discord match link (/matches/:id). Currently, anonymous visitors see basic match data with no hook and no explanation of what VCLoL is. This page must simultaneously serve three audiences: anonymous visitors (teaser + explainer), logged-in participants (full stats + celebration), and logged-in non-participants (privacy-gated view with ghost table).

### Challenge 3: RSO as Unlock, Not Gate
Identity verification research (Revolut, Wise, Duolingo, Steam Guard) shows that mandatory verification flows succeed when framed as "unlocking something you already want" rather than "completing a chore before you can start." VCLoL's RSO flow currently uses "Verify Your Riot Account" language (bureaucratic) rather than "Connect Your Riot Account" (OAuth-familiar). The Connect page should show concrete value before the action: "We found N matches you appeared in. Connect to claim your competitive profile."

### Challenge 4: Privacy Confidence Gap
Privacy research (Instagram, LinkedIn, Facebook Groups, GitHub) shows that users who can preview what others see feel more confident making profiles public. VCLoL has three privacy levels but no "Preview as visitor" mode. Players cannot see what their profile looks like to an outsider, which creates anxiety around the public setting and suppresses opt-in rates.

### Challenge 5: Captain Dependency and Retention
Retention research (Strava, Duolingo, Discord) reveals that VCLoL's viral loop depends entirely on captains submitting .rofl files. If captains stop submitting, the entire platform stalls. Captain-specific retention mechanics (submission milestones, team growth celebration, inactivity nudges) are absent.

### Challenge 6: Empty Dashboard Is a Dead End
Cold start research (Letterboxd, Duolingo, Notion) shows that empty states must show what the filled state looks like, not just say "no data yet." VCLoL's 0-match dashboard shows a text message. It should show a sample match card with placeholder data, a progress checklist starting at 20-25%, and links to browse active teams and recent matches.

---

## Recommendations by Area

### 1. Player Profile / Career Resume

**R1: Auto-Generated Player Summary Line**
- **What:** Server-computed 1-line summary wherever a player name appears: `Mid | VancouverStorm [VCS] | 67 organized games | 58% WR`
- **Why:** LinkedIn's headline is the single most powerful element on a profile. Recruiters make open/skip decisions based on it alone. Scouts scanning a list of 50 VCLoL players need the same compressed signal. Without it, the search results page is a list of Riot IDs that mean nothing to an evaluator.
- **Priority:** P1
- **Existing research said:** Section 2.2 covers career timelines but never identifies the need for a compressed summary line. The headline pattern is absent from docs/UI_UX_RESEARCH_2025.md.
- **Complexity:** Low -- data already exists, this is a display-layer change.

**R2: Build the Activity Heatmap**
- **What:** 52-week grid (GitHub contribution graph) showing match frequency per day on player profiles.
- **Why:** GitHub proved this is the strongest visual trust signal for evaluators. 83% of tech hiring managers trust GitHub profiles over resumes, and the contribution graph is the first thing they check. A green-filled grid says "this player practices consistently" more powerfully than any number. Already specified in DESIGN_GUIDE.md but not yet built.
- **Priority:** P2
- **Existing research said:** Not mentioned in UI_UX_RESEARCH_2025.md Section 2. This is a gap.
- **Complexity:** Medium -- frontend component + API endpoint for player match date aggregation.

**R3: Featured Matches (Pinned Highlights)**
- **What:** Players can pin 3-5 of their best matches to the top of their profile.
- **Why:** GitHub limits pinned repos to 6, forcing curation. Dribbble's top shots show that curated quality beats exhaustive history for evaluation. A scout seeing a player's best tournament performance pinned at the top is immediately drawn in. Without this, best performances are buried in chronological match history.
- **Priority:** P3
- **Existing research said:** Section 2.3 mentions "Comparison view: ability to compare metrics across projects/periods" but does not identify the curation pattern. GitHub's pinned repos concept is not referenced.
- **Complexity:** Medium -- new table or column, new API endpoints, new UI section.

**R4: RSO Verified Badge Everywhere**
- **What:** Small shield/checkmark icon next to every instance of a verified player's name across the entire platform (search results, match cards, team rosters, match detail rows).
- **Why:** VCLoL's core promise is "verified competitive record that cannot be faked." RSO verification is cryptographic proof via Riot OAuth -- stronger than LinkedIn's blue check. Currently, verification status is only visible on the profile page. LinkedIn's verification badge increases profile visibility and trust. 72% of employers prefer candidates with verified credentials.
- **Priority:** P1
- **Existing research said:** Section 2.4 mentions "badge/icon showing current privacy state" but frames it as privacy indicator, not trust signal. The prominence and ubiquity of the verification badge is not addressed.
- **Complexity:** Low -- UI component + prop threading. Data already exists.

**R5: Remove ELO Display from Player Profiles**
- **What:** Remove the ELO Trajectory section from PlayerProfile.tsx for scrim data.
- **Why:** Per PRD v3.1, ELO is team-level and tournament-only. Showing ELO on player profiles is misleading because it conflates team ELO with individual performance. OP.GG's ranked tier is irrelevant to VCLoL's goals (organized team play vs. solo queue). The career resume metrics (team W/L, KDA, champion pool) are the correct credentials.
- **Priority:** P1
- **Existing research said:** Not addressed.
- **Complexity:** Low -- remove existing component.

---

### 2. Match Data Display

**R6: Win/Loss Color Tint on Match Cards**
- **What:** Subtle background tint (blue for win, red for loss) or colored left border on match cards.
- **Why:** Every platform studied (OP.GG, U.GG, Tracker.gg, ESPN) uses color to communicate result before text is read. The human eye processes color faster than text. Result comprehension drops from 2-3 seconds (read text, parse "vs", find winner) to under 0.5 seconds (see blue = win). This is table stakes for any gaming stats platform.
- **Priority:** P1
- **Existing research said:** Section 3.4 correctly identifies blue (win) / red (loss) as the industry standard. Confirmed.
- **Complexity:** Low -- CSS class toggle.

**R7: Champion Composition on Match Cards**
- **What:** Two rows of 5 small champion portraits (20-24px) on every match card, one row per team.
- **Why:** OP.GG shows 10 tiny champion icons on every match card. Champion composition is the second most important match context after result (what did they play?). The existing research doc missed this entirely. For scouts, champion composition IS the narrative of a match.
- **Priority:** P1
- **Existing research said:** Section 3.2 describes match cards but does not include champion composition. This is the largest gap in the existing research's match data recommendations.
- **Complexity:** Medium -- requires match list API to return champion data (currently returns only team names, score, dates).

**R8: Score-First Match Detail Header**
- **What:** Restructure match detail page to put score as the largest element: `Team A Name [Score] - [Score] Team B Name` with WIN/LOSS indicators, then metadata badges below.
- **Why:** ESPN's #1 design principle is score-first. The current VCLoL header shows matchTitle first, then badges, then score. This is backwards. The score answers the question every user arrives with: "who won and by how much?" All sports data platforms (ESPN, OP.GG, NBA Stats) confirm this hierarchy.
- **Priority:** P1
- **Existing research said:** Section 1.2 identifies "key metrics positioned front-and-center" (Stripe pattern) but does not explicitly call out score-first hierarchy for match pages.
- **Complexity:** Low-Medium -- restructure existing JSX.

**R9: Two-Section Player Stats with Team Headers**
- **What:** Two separate card components for match detail (blue side table, red side table), each with team name header showing WIN/LOSS, and a team totals row at the bottom.
- **Why:** OP.GG, ESPN, and U.GG all use visually separated team sections. The current implementation combines both teams into one table with colored header rows. Separate sections create distinct visual regions, enable team-level totals, and let the winning team's section carry a subtle accent.
- **Priority:** P2
- **Existing research said:** Section 3.2 describes "Two halves (Team A blue side / Team B red side) stacked or side-by-side" but does not specify team totals row or distinct card separation. Team totals row is absent from the existing research.
- **Complexity:** Medium -- restructure existing component.

**R10: MVP/ACE Performance Badges**
- **What:** Calculate a simple performance score per player; award "MVP" badge to top performer on winning team, "ACE" to top on losing team.
- **Why:** OP.GG's most distinctive match detail feature. Adds evaluative context on top of raw data. Without it, users must mentally compute "who played best?" from the numbers. Transforms data from "here are numbers" to "here is performance context."
- **Priority:** P2
- **Existing research said:** Section 3.4 mentions "badges/tags: MVP, ACE, Pentakill" but does not specify calculation or implementation. This research provides the formula.
- **Complexity:** Low -- compute client-side from existing matchPlayers data.

**R11: Match Type Badge System**
- **What:** Color-coded badges per match type: SCRIM (gray), TOURNAMENT (gold/amber), EVENT (teal).
- **Why:** VCLoL has 3 match types with fundamentally different privacy and data rules. Users must know what type before clicking in. Tracker.gg does this with game mode badges.
- **Priority:** P1
- **Existing research said:** Not explicitly specified as a badge system with color coding.
- **Complexity:** Low -- styled badge component.

**R12: Ghost Table for Privacy-Gated Matches**
- **What:** For scrim matches viewed by non-participants, show champion icons and positions visible but KDA/CS/Gold/Items replaced with "--" or lock icons. Call-to-action: "Log in to see full stats (participants only)."
- **Why:** A blank page with "stats are private" tells the user nothing about what they are missing. The ghost table communicates the richness of available data, creating motivation to log in. ESPN does this with paywalled content -- they show the structure behind the wall.
- **Priority:** P2
- **Existing research said:** Section 7.2 covers empty states but does not address privacy-gated content display. This is a new pattern.
- **Complexity:** Medium -- conditional rendering of existing table with redacted cells.

**R13: Tabular-Aligned Monospace Numbers**
- **What:** Apply `font-variant-numeric: tabular-nums` to all stat cells in match detail tables.
- **Why:** Bloomberg and ESPN both use tabular-aligned numbers. When KDA values like "8/2/11" and "3/7/4" don't align vertically, scanning a column becomes difficult. Inter font (already in VCLoL stack) supports tabular-nums natively.
- **Priority:** P2
- **Existing research said:** Section 4.4 recommends "tabular/monospace figures for alignment." Confirmed.
- **Complexity:** Low -- CSS property.

**R14: Items Visible at All Breakpoints**
- **What:** Show items at all screen sizes. On mobile, render as a row of tiny icons (16px) below the KDA line instead of in a separate column.
- **Why:** Items are currently hidden below lg breakpoint. In competitive play, items are critical context. OP.GG shows items on every match card, even collapsed. U.GG does the same.
- **Priority:** P2
- **Existing research said:** Section 3.3 mentions "Prioritize 3-4 key fields per card" for mobile but includes items in the recommended visible set.
- **Complexity:** Low -- responsive layout adjustment.

---

### 3. Identity Verification (RSO) & Onboarding

**R15: Reframe RSO as "Connect" Not "Verify"**
- **What:** Change all copy from "Verify Your Riot Account" to "Connect Your Riot Account." Use shield icon and primary color button. Frame as "Login with Riot" (familiar OAuth pattern).
- **Why:** Steam Guard's "verification" language generates user complaints. "Login with Google" is comfortable because it is familiar. RSO is a standard OAuth redirect in the same browser -- closer to social login than to identity verification. The current Connect.tsx copy is functional but cold.
- **Priority:** P1
- **Existing research said:** Section 7.1 mentions "link RSO" in onboarding checklist but does not address the framing/language of the RSO flow.
- **Complexity:** Low -- copy changes.

**R16: Show Value Before RSO Gate**
- **What:** Before RSO verification, show locked/redacted stats preview: "We found N matches you appeared in. Connect to claim your competitive profile." Show the player's match appearances with stats redacted, making RSO feel like an unlock rather than a gate.
- **Why:** Duolingo's defining pattern: complete a lesson BEFORE creating an account. Wise lets users see exchange rates before KYC. Users who experience value before being asked to verify have dramatically higher completion rates. LinkedIn showed profile completion increases 55% with progress-based framing.
- **Priority:** P1
- **Existing research said:** Section 7.4 mentions "Interactive demos: let users explore with sample data" but does not identify the specific "show their own locked data" pattern.
- **Complexity:** Medium -- requires matching Discord user to match appearances before RSO.

**R17: Celebrate RSO Completion**
- **What:** Replace the current toast notification with a brief animation + expanded success card showing: "Welcome, [RiotId]! Your profile is now verified. [N] matches claimed." Provide two CTAs: "View your profile" and "Set your privacy level."
- **Why:** Duolingo shows confetti and streak animations after each lesson. The celebration is disproportionate to the accomplishment -- that is the point. It trains the reward loop. The current toast is functional but understated. The privacy CTA immediately after verification catches players at peak motivation.
- **Priority:** P2
- **Existing research said:** Section 7.1 mentions "Celebrate completion of each step (subtle animation, checkmark)" but is generic.
- **Complexity:** Low-Medium -- animation component + success state redesign.

**R18: Progress Checklist Starting at 20-25%**
- **What:** For all new players (not just captains), show a progress bar starting at 20-25% (account created = partial progress already) with 4-5 steps: (1) Create account [done], (2) Connect Riot account, (3) View first match, (4) Play 5 matches, (5) Set profile to public [optional bonus].
- **Why:** LinkedIn's profile completeness meter boosted completion by 55%. Gamified checklists see 50% higher completion rates than static forms. Starting at 0% feels daunting; starting at 20% leverages the Zeigarnik effect (people driven to finish partially completed tasks). Duolingo uses this.
- **Priority:** P2
- **Existing research said:** Section 7.1 recommends "Onboarding checklist: 3-5 items." The progress bar starting at a non-zero value is a new insight.
- **Complexity:** Low-Medium -- extend existing captain checklist to all players.

**R19: Return Users to the Content That Motivated Login**
- **What:** After Discord OAuth, redirect users back to the page they were on (e.g., /matches/42), not a generic dashboard.
- **Why:** Duolingo never redirects to an empty state after signup. The content that motivated login is the immediate reward for logging in. If a player clicked "Login to see your stats" on a match page, seeing those stats immediately reinforces the decision.
- **Priority:** P1
- **Existing research said:** Not addressed.
- **Complexity:** Medium -- store pre-auth URL in session/localStorage.

---

### 4. Privacy Controls

**R20: "Preview as Visitor" Mode**
- **What:** Button on the privacy settings card that opens a modal or drawer showing what the player's profile looks like to an outsider at the current privacy level.
- **Why:** LinkedIn's "View as" preview is the single most trust-building privacy feature across all platforms studied. Users who can preview feel more confident making profiles public. Without this, players cannot verify what they are exposing, creating anxiety around the public setting.
- **Priority:** P1
- **Existing research said:** Section 2.4 recommends "Preview mode: See what others see button showing the public view." Confirmed and reinforced by LinkedIn and Discord ("View as Role") patterns. Currently not implemented.
- **Complexity:** Medium -- render player profile in a modal with visibility filtering applied.

**R21: Concrete Privacy Level Descriptions**
- **What:** Replace abstract descriptions ("Full profile visible") with concrete WHO + WHAT explanations at the point of decision: "Scouts, coaches, and any visitor can see your career stats, champion pool, and match history."
- **Why:** Instagram shows inline explanations at the point of toggle ("Only your approved followers can see your photos and videos"). Facebook's simplification from 3 to 2 privacy levels was driven by users unable to distinguish abstract descriptions. Concrete > abstract.
- **Priority:** P1
- **Existing research said:** Section 2.4 mentions "Just-in-time consent: explain what becomes visible at each privacy level before confirming." Confirmed. Current implementation has brief descriptions that need more specificity.
- **Complexity:** Low -- copy changes in existing component.

**R22: Card-Based Privacy Selection**
- **What:** Replace radio buttons with three visual cards (one per privacy level), each showing icon + title + concrete description.
- **Why:** Visual cards are more scannable than radio lists. Each card becomes a self-contained explanation of a privacy level. Instagram and LinkedIn both use visual presentation for privacy choices rather than raw form controls.
- **Priority:** P3
- **Existing research said:** Not specified at this detail level.
- **Complexity:** Low -- component restructuring.

**R23: Match Visibility Independence Explained**
- **What:** In the UI, explicitly communicate that match visibility (captain controls) and profile visibility (player controls) are independent. A captain setting a match to public does not override a private player's profile privacy.
- **Why:** Facebook Groups' simplification lesson: separate orthogonal concerns into independent controls. VCLoL already separates these in the backend, but the UI does not explain the interaction. Players may fear that a captain making a match public exposes their private profile.
- **Priority:** P2
- **Existing research said:** Not addressed. This is a new insight from the Facebook Groups orthogonal-axes analysis.
- **Complexity:** Low -- explanatory text/tooltip.

---

### 5. Team Management (Captain Hub)

**R24: Roster as Visual Centerpiece**
- **What:** Reorganize CaptainHub so the roster section is the largest and most prominent, positioned above match visibility controls.
- **Why:** TeamSnap (25M users) positions roster as the primary screen. Discord server management centers on member list. VCLoL's CaptainHub currently gives equal visual weight to roster and match visibility sections. The roster IS the team.
- **Priority:** P2
- **Existing research said:** Not addressed at this specificity.
- **Complexity:** Low -- layout reordering.

**R25: Action-Oriented Over Settings-Oriented**
- **What:** Use prominent action buttons per member (Remove, Change Role) and inline visibility toggles per match, rather than settings forms and bulk management pages.
- **Why:** Discord's server management is primarily about DOING things (assign role, kick member) not CONFIGURING things. Slack uses consistent three-dot menus for per-item actions. Captains expect action buttons, not admin panels.
- **Priority:** P2
- **Existing research said:** Section 5.2 mentions "Captain Hub" as contextual addition but does not specify action-oriented vs. settings-oriented design.
- **Complexity:** Low-Medium -- component-level changes.

**R26: Celebrate Automatic Roster Growth**
- **What:** When a new member is auto-added from .rofl submission, show a brief celebration or highlight in the roster (e.g., "New: player3 joined from match #42").
- **Why:** VCLoL's automatic roster building from .rofl is a unique differentiator. Notion's workspace setup as value discovery (creating first page simultaneously teaches the product and produces value) parallels this. The auto-add should feel like a feature, not a side effect.
- **Priority:** P3
- **Existing research said:** Not addressed.
- **Complexity:** Low.

**R27: Flat Permission Model (Do Not Add Tiers)**
- **What:** Keep Captain + Member only. Do not add additional role tiers on the web.
- **Why:** Discord has 47 permissions and server owners routinely misconfigure them. Notion has 4 role tiers for a document workspace where granularity is needed. VCLoL's bot only supports captain and member. Adding web-specific permission levels would create confusion between bot and website capabilities.
- **Priority:** P1 (decision, not implementation)
- **Existing research said:** Not addressed.
- **Complexity:** N/A -- this is a constraint, not a feature.

---

### 6. Activation & Retention

**R28: Match Detail Page as Primary Landing Page**
- **What:** Optimize /matches/:id for the anonymous Discord-click visitor. Show match result (always public), micro-explainer ("What is VCLoL?" as a single collapsible line), teaser for stats (ghost table for scrims), and "Were you in this match?" CTA.
- **Why:** This is VCLoL's #1 entry point. Strava shows activity feeds publicly. Duolingo lets users experience value before signup. VCLoL must show enough to intrigue and gate enough to motivate login. The current match page has no hook for anonymous visitors.
- **Priority:** P1
- **Existing research said:** Section 7.2 covers empty states and Section 7.3 covers progressive onboarding by role, but neither addresses the match page as the primary anonymous landing page.
- **Complexity:** Medium -- redesign of existing page with audience-conditional rendering.

**R29: Personalized Discord Notifications**
- **What:** After match submission, send Discord DM to each participant: "Match recorded: VancouverStorm vs PacificRift. You went 8/2/11 on Orianna. [View full stats]"
- **Why:** Push notification research shows personalized messages perform 12x better than generic (1% to 12% CTR). Strava's post-activity notification is their #1 re-engagement driver. VCLoL's notification poller already exists but the message content should include the player's specific stats, not just "a match was recorded."
- **Priority:** P1
- **Existing research said:** Section 7 mentions notifications exist but does not design the re-engagement notification system.
- **Complexity:** Medium -- enhance existing notification poller messages.

**R30: Progressive Dashboard by Match Count**
- **What:** Replace the static dashboard with one that evolves based on data density: 0 matches (sample preview + checklist), 1-4 (recent matches + trends forming), 5-9 (first badge opportunities), 10-24 (full analytics + share CTA), 50+ (career resume + season comparisons).
- **Why:** Duolingo progressively introduces mechanics as they become relevant. Letterboxd faced criticism for the "empty, contextless experience" of new users. An empty dashboard with "no matches yet" is a dead end. A progressive dashboard that grows with the player reinforces the archive effect (the profile becomes more valuable with each match).
- **Priority:** P2
- **Existing research said:** Section 7.2 covers empty state messaging but does not address the progressive evolution of the dashboard by data density.
- **Complexity:** High -- conditional rendering based on match count thresholds, multiple UI states.

**R31: Season Summary / Wrapped Feature**
- **What:** At the end of each season, generate a personalized summary for active players: matches played, win rate, most-played champion, best performance, badges earned. Generate shareable PNG/SVG for Discord/social sharing.
- **Why:** Letterboxd's Year in Review generates massive social media virality (700M+ ratings cast by members). It serves both retention (users want data to share) and acquisition (shared content attracts new users). This is VCLoL's strongest potential viral mechanic beyond the match embed.
- **Priority:** P3
- **Existing research said:** Not addressed. This is a new concept from the Letterboxd analysis.
- **Complexity:** High -- data aggregation + image generation + sharing infrastructure.

**R32: Captain Retention Mechanics**
- **What:** Captain-specific milestones ("You've submitted 25 matches for VancouverStorm!"), team growth visualization, inactivity warnings at 21 days (before 30-day auto-deactivation).
- **Why:** VCLoL's viral loop depends entirely on captains submitting .rofl files. If captains stop, the platform stalls. Strava's challenge system keeps organizers engaged. Discord server health depends on moderator investment.
- **Priority:** P2
- **Existing research said:** Not addressed.
- **Complexity:** Medium -- notification triggers + milestone tracking.

---

### 7. General UI/UX Patterns

**R33: Match Duration on Match Cards**
- **What:** Show "32:14" text beside the date on every match card.
- **Why:** ESPN always shows game duration. OP.GG shows it. Duration is instant quality-of-life context -- a 20-minute stomp tells a different story than a 45-minute slugfest.
- **Priority:** P2
- **Existing research said:** Section 3.2 includes "duration" in match card fields. Confirmed.
- **Complexity:** Low.

**R34: OG Meta Tags for Rich Link Previews**
- **What:** Prioritize Open Graph meta tags so that sharing a VCLoL profile or match URL generates a rich preview on Discord, Twitter, etc.: "xiNe#NA1 | 67% WR | 4.2 KDA | VancouverStorm | VCLoL"
- **Why:** The existing DESIGN_GUIDE.md specifies a "Shareable Card" as a screenshot-optimized PNG. Real platforms show that shareability is about URL previews, not generated images. LinkedIn's value is that you share a URL and the recipient sees a rich preview. OG tags are the foundation.
- **Priority:** P2
- **Existing research said:** Not addressed. The "Shareable Card" concept in the design guide is related but the OG tag approach is more impactful and lower effort.
- **Complexity:** Low-Medium -- server-side rendering or meta tag injection for key pages.

**R35: VCLoL Explainer Collapse**
- **What:** Replace the full-height "What is VCLoL?" banner on match detail with a single collapsible line: "What is VCLoL? >" that expands on click. Dismissable, stored in localStorage.
- **Why:** The current implementation takes too much vertical space, pushing actual match data below the fold. Non-logged-in users need an explainer, but it should not compete with the match result for attention.
- **Priority:** P2
- **Existing research said:** Not addressed.
- **Complexity:** Low.

---

## What the Existing Research Got Right

1. **Cards for browsing, tables for comparison.** Section 4.6 correctly identifies the hybrid approach. Confirmed by all platforms.
2. **Blue (win) / Red (loss) color coding.** Section 3.4 matches OP.GG, ESPN, U.GG. Avoids colorblind issues with green/red.
3. **Progressive disclosure pattern.** Section 1.3 accurately describes the industry standard. Confirmed universally.
4. **Dark mode default for gaming.** Section 4.2 correctly identifies dark mode as expected for gaming/analytics tools.
5. **Skeleton loading screens.** Section 4.3 accurately describes shimmer patterns. Industry standard.
6. **Reverse chronological career timeline.** Section 2.2 matches LinkedIn, GitHub, Behance patterns.
7. **Per-team card-based display.** Section 2.3 correctly recommends team-specific stat cards. Already implemented.
8. **Empty state design with educational CTAs.** Section 7.2 is comprehensive and accurate.
9. **Role-based navigation (topbar for public, sidebar for admin).** Section 5.2-5.3 is correct and already implemented.
10. **Cmd+K command palette.** Section 5.1 correctly identifies the pattern and notes cmdk is already installed.

## What the Existing Research Got Wrong or Missed

### Got Wrong

1. **"Accordion/Expandable Rows" for match list.** Section 1.3 recommends this, but in practice OP.GG users primarily click through to full detail pages. Inline expansion is a secondary interaction. VCLoL should focus on the click-through pattern, not inline expansion.

2. **"Hover tooltips for KDA breakdown."** Section 1.3 suggests this, but OP.GG shows full K/D/A inline. Tooltips are for item descriptions, not primary stat fields. KDA is too important to hide behind hover.

3. **"Limit to 5-7 key metrics visible" applied universally.** This is correct for dashboards but wrong for match detail pages. A match detail page shows 10 players x 8+ columns. The user CHOSE to drill in. The limit applies to summary/list views only.

4. **"Sortable columns" for match detail.** Section 3.2 suggests sortable columns. ESPN and OP.GG match detail tables are read-only. 10 players is not enough data to make sorting useful. Sorting belongs on aggregate views (leaderboards), not individual match detail.

### Missed Entirely

1. **No player summary line / headline concept.** The most powerful pattern from LinkedIn (7-second scanner problem) is absent.

2. **No activity heatmap.** GitHub's contribution graph is the strongest visual trust signal for evaluators. Not mentioned in the research despite being in DESIGN_GUIDE.md.

3. **No champion composition on match cards.** The single most impactful missing element. Every LoL platform shows champion icons on match cards.

4. **No "show value before gate" activation pattern.** The Duolingo/Wise insight that users should experience value before being asked to verify is absent.

5. **No retention loop analysis.** Section 7 covers first-time experience but not what brings users back on day 7, 30, or 90.

6. **No notification strategy design.** Notifications exist in the codebase but the research does not address message content, frequency, or personalization.

7. **No "aha moment" identification.** The research describes onboarding mechanics but never defines what the activation moment IS.

8. **No Season Summary / Wrapped concept.** Letterboxd's strongest viral mechanic is absent.

9. **No ghost table for privacy-gated content.** The restricted match view is underdeveloped.

10. **No score-first match detail hierarchy.** The ESPN pattern of result-as-headline is not called out.

11. **No team totals row in match detail.** ESPN and OP.GG both show team aggregate totals. Absent from existing research.

12. **No captain retention mechanics.** The platform's dependency on captain submissions is not addressed.

---

## Anti-Patterns to Avoid (Things VCLoL Should NOT Do)

**AP1: Do NOT display solo queue rank prominently.**
OP.GG puts ranked tier as the largest visual element. VCLoL measures something fundamentally different -- organized team play. Solo queue rank is irrelevant and would dilute the verified-team-play value proposition.

**AP2: Do NOT copy OP.GG's density on match cards.**
OP.GG shows 10+ data fields per card because their audience visits daily and reviews 5-20 matches per session. VCLoL users play 1-3 scrims per session and visit occasionally. Match cards should show 5-6 fields max. Details belong on the detail page.

**AP3: Do NOT add Bloomberg-style data density.**
Bloomberg works because users spend 8+ hours/day and have built mental models over months. VCLoL users are casual visitors. Density must be earned through progressive disclosure.

**AP4: Do NOT implement daily streaks.**
Duolingo's streak works because language learning is a daily habit. Scrims are weekly or biweekly. A daily streak mechanic would feel forced and create guilt. Use match streaks (consecutive wins) and season participation instead.

**AP5: Do NOT use guilt-based re-engagement notifications.**
Duolingo's guilt-tripping owl works for a free language app. For Diamond+ competitive players, guilt feels patronizing. Frame re-engagement as opportunity ("3 new matches were recorded in your league this week") not obligation.

**AP6: Do NOT add social engagement metrics (likes, views, saves).**
Dribbble-style vanity metrics do not correlate with competitive ability. A match going "viral" tells you nothing about skill. Focus on intrinsic metrics: win rate, KDA, consistency, tournament results.

**AP7: Do NOT add endorsements or recommendations.**
LinkedIn's endorsement system ("good mid laner" from a teammate) adds nothing when verified .rofl data already proves it. Subjective endorsements would dilute the verified record.

**AP8: Do NOT add real-time match tracking.**
OP.GG and U.GG have Riot API access for live games. VCLoL is replay-based. Mimicking live features creates expectations VCLoL cannot fulfill.

**AP9: Do NOT add permission tiers beyond Captain/Member.**
Discord has 47 permissions and they are routinely misconfigured. The bot supports captain and member only. Web-specific permission levels create confusion.

**AP10: Do NOT gate all content behind login.**
Strava shows activities publicly. Letterboxd shows ratings publicly. VCLoL's 3-layer privacy model is correct, but gating everything behind login kills the viral loop. Team W/L records, match scores, and tournament stats must remain publicly visible.

**AP11: Do NOT show ELO delta on scrim matches.**
Per PRD v3.1, scrims do not count ELO. The current MatchDetail.tsx still renders EloDelta. This must be removed for scrim matches.

**AP12: Do NOT use bento grid for match lists.**
Bento works for dashboards (mixed data types). Match lists are chronological, same-type data that requires vertical card lists. All platforms confirm this.

---

## Prioritized Action List

### P1 -- Must Have for Launch (Ship-Blocking)

| # | Recommendation | Complexity | Ref |
|---|---------------|------------|-----|
| 1 | Win/Loss color tint on match cards | Low | R6 |
| 2 | Match type badge system (SCRIM/TOURNAMENT/EVENT) | Low | R11 |
| 3 | Score-first match detail header | Low-Medium | R8 |
| 4 | Champion composition on match cards | Medium | R7 |
| 5 | RSO framing: "Connect" not "Verify" | Low | R15 |
| 6 | Show value before RSO gate (locked stats preview) | Medium | R16 |
| 7 | Return users to pre-auth page after login | Medium | R19 |
| 8 | Concrete privacy level descriptions (WHO sees WHAT) | Low | R21 |
| 9 | "Preview as visitor" privacy mode | Medium | R20 |
| 10 | Auto-generated player summary line | Low | R1 |
| 11 | RSO verified badge everywhere | Low | R4 |
| 12 | Remove ELO from scrim match cards and player profiles | Low | R5, AP11 |
| 13 | Flat permission model decision (Captain + Member only) | N/A | R27 |
| 14 | Match detail page optimized for anonymous visitors | Medium | R28 |
| 15 | Personalized Discord match notifications | Medium | R29 |

### P2 -- Should Have (Post-Launch, High Impact)

| # | Recommendation | Complexity | Ref |
|---|---------------|------------|-----|
| 16 | Activity heatmap (GitHub contribution graph) | Medium | R2 |
| 17 | Two-section player stats with team totals | Medium | R9 |
| 18 | MVP/ACE performance badges | Low | R10 |
| 19 | Ghost table for privacy-gated matches | Medium | R12 |
| 20 | Tabular-aligned monospace numbers | Low | R13 |
| 21 | Items visible at all breakpoints | Low | R14 |
| 22 | Celebrate RSO completion (animation + success card) | Low-Medium | R17 |
| 23 | Progress checklist starting at 20-25% for all players | Low-Medium | R18 |
| 24 | Match visibility independence explained in UI | Low | R23 |
| 25 | Roster as visual centerpiece in CaptainHub | Low | R24 |
| 26 | Action-oriented CaptainHub (inline toggles, action buttons) | Low-Medium | R25 |
| 27 | Captain retention mechanics (milestones, inactivity nudges) | Medium | R32 |
| 28 | Progressive dashboard by match count | High | R30 |
| 29 | Match duration on match cards | Low | R33 |
| 30 | OG meta tags for rich link previews | Low-Medium | R34 |
| 31 | VCLoL explainer collapse on match detail | Low | R35 |

### P3 -- Nice to Have (Future Enhancement)

| # | Recommendation | Complexity | Ref |
|---|---------------|------------|-----|
| 32 | Featured matches (pinned highlights) | Medium | R3 |
| 33 | Card-based privacy selection | Low | R22 |
| 34 | Celebrate automatic roster growth | Low | R26 |
| 35 | Season summary / Wrapped feature | High | R31 |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Career Portfolio patterns | MEDIUM-HIGH | LinkedIn, GitHub studied directly. Scout workflow data from credible sources. VCLoL-specific application is synthesized, needs validation. |
| Match Data display | HIGH | Direct platform analysis of OP.GG, U.GG, ESPN, Tracker.gg. Patterns are well-established and industry-standard. |
| Identity & Privacy | MEDIUM-HIGH | Research-backed patterns from banking (Revolut/Wise), social (Instagram/LinkedIn), and dev tools (GitHub). VCLoL-specific application is sound but untested. |
| Activation & Retention | MEDIUM-HIGH | Strava and Duolingo publish extensive growth data. Letterboxd/Discord patterns well-documented. VCLoL "aha moment" definition is synthesized and needs A/B validation. |
| Existing research accuracy | HIGH | The existing UI_UX_RESEARCH_2025.md is largely correct on surface patterns but consistently misses deeper strategic insights. |
| Platform bootstrap estimate | LOW | 200 active players threshold is extrapolated from marketplace research. VCLoL-specific number needs validation. |

### Gaps That Need Attention

1. **Scout behavior validation.** The 7-second evaluation model is extrapolated from LinkedIn recruiter research. How amateur esports scouts actually evaluate players (tool usage, time spent, decision factors) has not been directly studied.
2. **RSO friction measurement.** The "value before gate" pattern is theoretically sound but the actual drop-off rate at the RSO step is unknown until the flow is live.
3. **Notification frequency tuning.** The 2-5 per week recommendation is industry benchmark. Optimal frequency for scrim-active players (who may play 0-3 times per week) needs testing.
4. **Mobile usage percentage.** All platforms studied show high mobile usage (OP.GG, Strava). VCLoL's audience (PC gamers in Discord) may skew heavily desktop. Mobile optimization priority should be validated with analytics.
5. **Captain submission motivation.** Why captains submit (or stop submitting) .rofl files is the single most important behavioral question for VCLoL's survival. No existing research addresses this directly.

---

## Sources

All sources are documented in the individual research files:

- `.planning/research/DEEP_CAREER_PORTFOLIO.md` -- 27 sources (LinkedIn, GitHub, Behance, OP.GG, esports scouting, verified credentials)
- `.planning/research/DEEP_MATCH_DATA.md` -- 17 sources (OP.GG, U.GG, ESPN, Bloomberg, Stripe, Tracker.gg)
- `.planning/research/DEEP_IDENTITY_PRIVACY_TEAMS.md` -- 29 sources (Revolut, Wise, Twitter/X, Steam, Duolingo, Instagram, LinkedIn, Facebook, GitHub, Discord, Notion, Slack, TeamSnap)
- `.planning/research/DEEP_ACTIVATION_RETENTION.md` -- 27 sources (Strava, Duolingo, Letterboxd, Discord, Goodreads, product-led growth, notifications)
- `docs/UI_UX_RESEARCH_2025.md` -- 40+ sources (dashboards, gaming platforms, design patterns, mobile, onboarding)
