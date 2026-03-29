# Deep UX Research: Identity Verification, Privacy Controls & Team Management

**Project:** VCLoL
**Researched:** 2026-03-28
**Overall confidence:** MEDIUM-HIGH (research-backed patterns applied to VCLoL-specific context)

---

## Table of Contents

1. [Area 1: Identity Verification UX](#area-1-identity-verification-ux)
2. [Area 2: Privacy & Visibility Controls](#area-2-privacy--visibility-controls)
3. [Area 3: Team Management](#area-3-team-management)
4. [VCLoL Gap Analysis](#vclol-gap-analysis)
5. [Synthesis: Design Recommendations](#synthesis-design-recommendations)
6. [Sources](#sources)

---

## Area 1: Identity Verification UX

### The Core Problem for VCLoL

RSO is a **mandatory** identity gate. Unlike optional features where poor UX means low adoption, poor RSO UX means players literally cannot use the platform. The /connect flow is the single highest-stakes UX moment in the entire product.

Current state: Connect.tsx handles three states (token present, error, no-token fallback). The page exists but the actual RSO OAuth handler is not yet wired. Players who visit /connect without a token see a dead-end page suggesting Discord.

---

### Platform Study: Revolut / Wise (Banking KYC)

**What:** Legally required identity verification (government ID, address, biometrics) for financial services.

**Who:** Every user -- cannot be skipped. Demographic: mass market, all ages, varying tech literacy.

**When:** During onboarding, before first transaction. Wise defers full KYC until a financial threshold is hit.

**Where:** Mobile-first (Revolut app), responsive web (Wise).

**Why it works despite high friction:**

1. **Progressive verification.** Revolut reduced KYC time from 70 minutes to ~2 minutes by using electronic ID verification (eIDV) instead of manual document upload. The key: they do not front-load the full verification at signup. Users provide basic details (name, DOB, address) first, then verify ID as a separate step when needed.

2. **Wise's deferred model.** Wise lets users set up an account and initiate a transfer before completing full ID verification. Users experience the product's value (seeing exchange rates, setting up a transfer) before being asked to verify. The verification feels like the last step to "unlock" something they already want, not a gate before they know what they are getting.

3. **Minimal form fields.** Each additional form field = measurable friction. Both platforms ask only what is legally required, nothing more. No "optional" profile fields during verification.

4. **Clear progress indication.** Both use step indicators showing where the user is in the process (Step 2 of 3). This leverages the Zeigarnik effect -- people who see partial completion are psychologically driven to finish.

5. **Immediate reward signal.** After verification, both platforms show a clear success state with a celebratory moment, then immediately redirect to the next valuable action.

**VCLoL takeaway:** RSO verification is simpler than banking KYC (it is a standard OAuth redirect, no document upload). The flow should be faster than Revolut's 2-minute benchmark. The design challenge is not the verification itself but the *framing* -- making players feel they are unlocking something valuable, not completing a chore.

---

### Platform Study: Twitter/X Verification

**What:** Identity verification via paid subscription or government ID.

**Who:** Public figures (legacy) then any paying subscriber (post-2022).

**When:** Optional, at any time.

**Where:** Web and mobile.

**Why it partially failed and what VCLoL can learn:**

1. **Trust confusion.** The blue checkmark originally meant "this person is who they claim to be" (identity verification). After the change to paid subscription, it meant "this person pays $8/month" (financial transaction). The same visual symbol communicated completely different things to different users. Impersonation attempts spiked immediately because the badge no longer reliably signaled authenticity.

2. **Multi-tier badges worked better.** When X introduced gold checkmarks (companies) and gray (government), the confusion partially resolved because each badge type had a clear, distinct meaning. Different badge types for different verification methods is sound UX.

3. **Government ID option restored trust.** X later added an optional "ID Verified" label for Premium subscribers who upload government ID. This two-tier system (paid + verified vs. paid-only) restored some trust signal.

**VCLoL takeaway:** VCLoL's verification is fundamentally different -- it is not paid and not optional for profile claims. But the lesson applies: the verification badge must communicate ONE clear thing. A verified player badge on VCLoL should mean "this person has proven they own this Riot account via RSO" and nothing else. Do not dilute the badge meaning. The green checkmark in CaptainHub roster already does this correctly.

**Anti-pattern to avoid:** Never show a badge that could mean multiple things. "Verified" on VCLoL must always mean RSO-verified, never "has a profile" or "is active."

---

### Platform Study: Steam Guard / Riot Client

**What:** Two-factor authentication and account linking for gaming platforms.

**Who:** Gamers with existing accounts on the platform.

**When:** During setup (Steam Guard) or when linking accounts (Riot RSO).

**Where:** Desktop client + mobile app (Steam), browser redirect (Riot RSO).

**Why Steam Guard is a documented UX pain point:**

1. **Context switching kills flow.** Steam Guard requires users to: open phone, find Steam app, navigate to Steam Guard tab, read 5-digit code, switch to PC, type code manually. This is 6 discrete steps across two devices. Users hate it and vocal complaints are widespread.

2. **Blizzard solved this.** Blizzard Authenticator replaced manual code entry with a single "Approve" button push notification. One tap, same security level. The lesson: if the security requirement can be reduced to a single confirmation action, do it.

3. **Riot RSO is already simpler.** RSO uses standard OAuth2 browser redirect. The player logs in to their Riot account in the same browser -- no device switching, no code copying. This is closer to "Login with Google" than to Steam Guard.

**VCLoL takeaway:** RSO verification is inherently lower friction than Steam Guard because it is a standard OAuth redirect in the same browser window. VCLoL should emphasize this -- the copy should frame it as "Login with your Riot account" (familiar, 10 seconds) not "Verify your identity" (sounds bureaucratic, unclear duration). The current Connect.tsx copy ("Verify Your Riot Account") is functional but could be warmer.

---

### Platform Study: Duolingo / Notion (Activation Specialists)

**What:** Onboarding flows designed to minimize time-to-value.

**Who:** Mass market (Duolingo), knowledge workers (Notion).

**When:** First interaction with the product.

**Where:** Mobile (Duolingo), web + desktop (Notion).

**Why Duolingo achieves 70%+ activation rates:**

1. **Value before account creation.** Duolingo's defining pattern: the user completes their first lesson BEFORE creating an account. By the time they are asked to sign up, they have already experienced the product's value. Signup feels like saving progress, not a gate.

2. **Personalization questions reduce perceived friction.** Asking "Why are you learning?" and "What is your daily goal?" takes time but does not feel like friction because users perceive they are customizing their experience. These questions are both useful data collection AND value signaling.

3. **Progress bar psychology.** Starting the onboarding progress bar at 20% (not 0%) leverages the Zeigarnik effect. Users who see partial completion feel compelled to finish. LinkedIn boosted profile completion by 55% using this pattern. Gamified checklists see 50% higher completion rates than static forms.

4. **Celebrate every step.** Duolingo shows confetti, sound effects, and streak animations after completing each lesson. The celebration is disproportionate to the accomplishment -- and that is the point. It trains the reward loop.

**Notion's approach:**

1. **Template-first onboarding.** New users see pre-built templates, not a blank page. This eliminates the "cold start" problem where users do not know what to do first.

2. **Workspace setup as value discovery.** Instead of asking users to configure settings, Notion guides them through creating their first page, which simultaneously teaches the product and produces immediate value.

**VCLoL takeaway for RSO/onboarding flow:**

The current dashboard (PlayerDashboard.tsx) already has a "Getting Started" checklist for captains with three steps: (1) Verify Riot identity, (2) Submit first scrim, (3) Build roster through replays. This is good. But it could be improved:

- **Start the progress bar at 20-25%** (account created = partial progress already). Do not start at 0%.
- **Show value before verification.** When a player first logs in via Discord, show them sample data or their unverified match appearances: "We found 3 matches you played in. Verify your Riot account to claim your stats." This transforms RSO from a gate into an unlock.
- **Celebrate RSO completion.** The current implementation (toast "Riot account verified") is functional but understated. A brief animation or a more prominent success state would reinforce the reward.
- **Deferred verification option.** Let players browse their dashboard and see redacted/locked stats before verifying. Let them see what they are missing. Then the RSO button is "unlock my stats" not "verify before you can do anything."

---

### Identity Verification: Synthesis of Best Practices

| Principle | Evidence | VCLoL Application |
|-----------|----------|-------------------|
| Value before gate | Duolingo: lesson before signup. Wise: see rates before KYC | Show match appearances before RSO verify |
| Minimum steps | Revolut: 2min KYC. Each field = friction | RSO is 1 redirect. Frame as "Login with Riot" |
| Progress indicators | 50% higher completion with progress bars | Start onboarding checklist at 20% |
| Celebrate completion | Duolingo: confetti. LinkedIn: 55% more completions with progress | Animation + prominent success on RSO completion |
| Clear badge meaning | X: confusion when badge meant two things | "Verified" = RSO-verified only, never dilute |
| Familiar framing | Steam Guard UX complaints vs "Login with Google" comfort | "Connect your Riot account" not "Identity verification" |
| Deferred verification | Wise: use before verify. Duolingo: play before signup | Let players browse dashboard pre-RSO, lock stats |

---

## Area 2: Privacy & Visibility Controls

### The Core Problem for VCLoL

VCLoL has a 3-layer privacy model in the backend (scrim=login+participant, RSO opt-in=public profile, tournament=public by design). The PlayerDashboard.tsx already has a Profile Privacy card with three radio options (Public, Participants-only, Private). But the UX around these controls needs depth: players need to understand WHAT becomes visible at each level, preview the result, and feel confident in their choice.

---

### Platform Study: Instagram (Simple Privacy Toggles)

**What:** Content visibility controls (public account, private account, close friends list).

**Who:** 2B+ users, all demographics. Must be intuitive for lowest-common-denominator tech literacy.

**When:** Account setup and ongoing settings adjustment.

**Where:** Mobile-first, also web.

**Why Instagram's privacy model works:**

1. **Binary default with one escape hatch.** The core toggle is binary: Public Account vs. Private Account. This covers 90% of use cases. Close Friends is the one granular control, and it applies only to Stories -- a specific, bounded context.

2. **The 2019 simplification lesson.** Facebook Groups went from three privacy levels (Public, Closed, Secret) to two (Public, Private) with an orthogonal visibility toggle (Visible, Hidden). Why? User research showed people could not reliably distinguish "Closed" from "Secret." Simplifying to two levels with a clear definition eliminated confusion.

3. **Inline explanations.** When toggling to Private, Instagram shows a clear explanation: "Only your approved followers can see your photos and videos." The explanation is shown AT THE POINT OF DECISION, not buried in a help article.

4. **Close Friends as progressive disclosure.** The Close Friends feature is not shown during account setup. Users discover it when they post a Story -- the option appears contextually. This avoids overwhelming new users with granular controls they do not need yet.

**VCLoL takeaway:**

VCLoL has three levels (public, participants-only, private) which maps to Facebook Groups' former three-level problem. However, VCLoL's three levels are genuinely distinct and serve different audiences:

- **Public**: scouts and coaches can see your career resume
- **Participants-only**: only people you have played with/against can see your stats
- **Private**: only you can see your stats

The key is EXPLAINING each level at the point of decision. The current PlayerDashboard.tsx shows brief descriptions ("Full profile visible", "Match participants only", "Stats hidden") but these could be more concrete. Players need to understand WHO can see WHAT at each level, not abstract descriptions.

**Recommended change:** Show concrete examples at each level:
- Public: "Scouts, coaches, and any visitor can see your career stats, champion pool, and match history"
- Participants-only: "Only players you have been in a match with can see your detailed stats"
- Private: "Only you can see your stats. Others see your Riot ID and team affiliations only"

---

### Platform Study: LinkedIn (Granular But Not Overwhelming)

**What:** Professional profile visibility with per-section controls, "Who viewed your profile" feature, anonymous browsing mode.

**Who:** Professionals managing career visibility. Mix of job seekers (want max visibility) and employed people (want discretion).

**When:** Ongoing management, changes with career phase.

**Where:** Web and mobile.

**Why LinkedIn's approach works for VCLoL's context:**

1. **"View as" preview feature.** LinkedIn lets users see their public profile as others would see it. This is the single most trust-building privacy feature: "see what others see" before committing to a visibility level. Users who can preview feel more confident making their profile public.

2. **Reciprocal visibility trade-off.** LinkedIn's "Who viewed your profile" feature has an elegant trade-off: if you browse anonymously, you also lose the ability to see who viewed YOUR profile. This makes the privacy cost tangible and helps users make informed decisions.

3. **Section-level granularity.** LinkedIn allows controlling visibility per profile section (experience, education, skills). This is overkill for VCLoL's initial launch but relevant for future consideration (e.g., letting players show aggregate stats but hide specific match details).

4. **Default to semi-visible.** LinkedIn's default shows your name + headline + photo to everyone, with details gated. This "teaser" approach encourages profile building while protecting sensitive details.

**VCLoL takeaway:**

- **Implement "Preview as visitor" mode.** When a player adjusts their privacy setting, show a preview of what a visitor (or participant, or nobody) would see. This is the highest-value privacy UX feature and is currently missing from PlayerDashboard.tsx.
- **LinkedIn's "teaser" applies to VCLoL.** Even private profiles show Riot ID and team affiliations (already documented in PRD). This is correct -- the "teaser" encourages RSO opt-in without exposing private stats.
- **Save section-level granularity for v2.** Three levels (public/participants/private) is the right amount of complexity for launch. Per-section controls add cognitive load without proportional value at VCLoL's current stage.

---

### Platform Study: Facebook Groups (Group-Level Privacy)

**What:** Privacy controls for group content, membership visibility, and discoverability.

**Who:** Group admins managing privacy for their communities.

**When:** At group creation and ongoing management.

**Where:** Web and mobile.

**Why the simplification from 3 levels to 2 matters:**

1. **The three-level failure.** Facebook Groups originally had Public, Closed, and Secret. User research showed admins could not consistently distinguish Closed from Secret. The cognitive overhead of three levels that "sort of overlap" caused errors and confusion.

2. **The solution: orthogonal axes.** Facebook replaced the three levels with two orthogonal toggles:
   - Privacy: Public or Private (who can see posts and membership)
   - Visibility: Visible or Hidden (whether the group appears in search)

   This is clearer because each toggle controls ONE dimension.

3. **Content privacy vs. discoverability are separate concerns.** A group can be Private (only members see posts) but Visible (anyone can find it in search). This separation maps directly to VCLoL's needs.

**VCLoL takeaway:**

VCLoL's match visibility and player profile visibility are already separate concerns handled by different people (captain controls match visibility, player controls profile visibility). This is correct. But the UX should make this separation explicit:

- **Match visibility (captain controls):** "Who can see detailed stats for this match?" Public/Private toggle per match, with a team-level default.
- **Profile visibility (player controls):** "Who can see your career stats?" Public/Participants/Private.
- **These are independent.** A captain setting a match to public does not override a private player's profile privacy. A private player's row in a public match shows redacted data (already in PRD). The UI should make this interaction clear.

**Anti-pattern to avoid:** Do not combine match visibility and profile visibility into a single control. They are owned by different people and serve different purposes.

---

### Platform Study: GitHub (Simple Binary with Clear Consequences)

**What:** Repository visibility toggle (Public/Private) with explicit consequence warnings.

**Who:** Developers managing code visibility.

**When:** At repo creation and when changing settings.

**Where:** Web.

**Why GitHub's pattern is instructive:**

1. **"Danger Zone" framing.** GitHub places the visibility toggle in a red-bordered "Danger Zone" section with explicit warnings about what changes. This is appropriate for irreversible or high-impact changes.

2. **Consequence enumeration.** Before changing to private, GitHub lists specific consequences: "Public forks will be detached," "GitHub Pages will be unpublished," "Actions history will change." Users see EXACTLY what will happen before confirming.

3. **Confirmation required.** Users must type the repository name to confirm the change. This prevents accidental toggles.

4. **Simple binary, complex consequences.** The toggle itself is simple (Public/Private) but the implications are complex. GitHub handles this by showing the implications only when the user initiates a change, not cluttering the default view.

**VCLoL takeaway:**

- Match visibility changes should show what becomes visible/hidden before confirming. Example: "Setting this match to public will make all 10 players' stats visible to anyone. Players with private profiles will still show as [Redacted Player]."
- Profile visibility changes should enumerate consequences: "Setting your profile to Public means: your career stats appear in search results, scouts can view your match history, your champion pool is visible to visitors."
- Do NOT use "Danger Zone" framing for VCLoL -- going public is a positive action (more exposure), not a dangerous one. Frame it as "unlock" not "danger."

---

### Privacy Controls: Synthesis of Best Practices

| Principle | Evidence | VCLoL Application |
|-----------|----------|-------------------|
| Explain at point of decision | Instagram: inline explanation on toggle | Show WHO sees WHAT at each privacy level |
| Preview before commit | LinkedIn: "View as" public profile preview | Add "Preview as visitor" to privacy settings |
| Simple defaults, progressive granularity | Facebook: 3 levels to 2 + orthogonal toggle | Keep 3 levels for launch, add per-section later |
| Separate orthogonal concerns | Facebook Groups: privacy vs. discoverability | Match visibility (captain) vs. profile visibility (player) |
| Enumerate consequences | GitHub: list what changes before confirming | Show concrete changes when toggling visibility |
| Frame positively | GitHub uses "Danger Zone" for going private | VCLoL: frame going public as "unlock" not "risk" |
| Concrete over abstract | Instagram: "Only approved followers" not "Restricted access" | "Scouts and coaches can see" not "Full profile visible" |

---

## Area 3: Team Management

### The Core Problem for VCLoL

Team management in VCLoL is split across two interfaces: Discord bot commands (primary for daily operations) and CaptainHub web page (secondary for settings/visibility). The CaptainHub exists but was described as "not touched in v3.1-v3.3." Players already know Discord's management patterns. The web interface should complement, not duplicate, what the bot does.

---

### Platform Study: Discord (Server Management)

**What:** Server management with roles, permissions, channels, and member controls.

**Who:** Server owners and admins. VCLoL's target users already use Discord daily.

**When:** Ongoing server management.

**Where:** Desktop and mobile apps.

**Why Discord's patterns matter most for VCLoL:**

1. **VCLoL users already have Discord muscle memory.** This is the most important finding. VCLoL's target audience (Diamond+ NA players in scrim Discord servers) uses Discord for hours daily. They understand roles, permissions, kicking/banning, and channel management. Any team management UX on VCLoL's website should not contradict these mental models.

2. **Role hierarchy is intuitive.** Discord's system where higher roles override lower roles is understood by the target audience. VCLoL's captain/member distinction maps to this: captain = admin, member = member. Do not introduce additional role tiers at launch -- the bot only supports captain and member, and adding complexity on the web would create confusion.

3. **"View as Role" feature.** Discord added a feature that lets admins see the server as a specific role would see it. This is the same "preview as" pattern from LinkedIn, applied to team management. It helps captains understand what their team members experience.

4. **47 permissions is TOO granular.** Discord has 47 permissions. Server owners routinely misconfigure them. For VCLoL team management, the permissions model should be flat: captain can do everything, members can view. Do not replicate Discord's permission granularity on the web.

5. **Action-oriented over settings-oriented.** Discord's server management is primarily about DOING things (create channel, assign role, kick member) rather than CONFIGURING things. The CaptainHub should follow this: prominent action buttons (set visibility, remove member) rather than settings forms.

**VCLoL takeaway:**

- Captain Hub should feel like Discord's server settings, not like Notion's workspace settings. Captains expect: member list with status indicators, action buttons per member (remove, change role), and match-level controls.
- Do NOT add permission tiers beyond captain/member. The bot does not support them, and Discord users do not expect website-specific permission models.
- Use action-oriented design: "Remove from roster" button, not a "Membership management" settings page.

---

### Platform Study: Notion (Workspace Management)

**What:** Workspace member management with roles (Owner, Admin, Member, Guest) and teamspaces.

**Who:** Knowledge workers managing team access to documents.

**When:** Setup and ongoing member management.

**Where:** Web and desktop app.

**Why Notion's model is relevant but not directly transferable:**

1. **Four role tiers.** Notion has Owner > Admin > Member > Guest. This makes sense for a document workspace where different people need different edit/view permissions. VCLoL does not need this -- there is one captain and members. Period.

2. **Teamspaces for sub-groups.** Notion's teamspaces let organizations create sub-groups with their own permissions. This is irrelevant for VCLoL's team model but could become relevant if VCLoL ever supports multi-team organizations or leagues.

3. **Invite flow is minimal.** Notion invites members via email or link. One action, one result. VCLoL's roster building is even simpler -- it is automatic from .rofl submission. The CaptainHub should make this automatic nature prominent and celebrate it (not hide it).

4. **Guest model is interesting.** Notion's "Guest" concept (invited to specific pages, not the whole workspace) maps loosely to VCLoL's unverified players: they exist in the system, they appear in matches, but they have not "joined" the workspace (verified via RSO). The CaptainHub roster already shows verified vs. unverified status -- this is the right approach.

**VCLoL takeaway:**

- Do not replicate Notion's role tiers. Captain + Member is sufficient.
- Notion's Guest concept validates VCLoL's approach of showing unverified players in the roster with a different status indicator.
- Notion's invite-by-link is interesting for VCLoL's future: a captain could share a "join my team" link that triggers RSO verification.

---

### Platform Study: Slack (Workspace Admin)

**What:** Workspace and channel administration with roles, channel management tools, and member management.

**Who:** Workspace owners/admins managing team communication.

**When:** Setup and ongoing management.

**Where:** Web and desktop app.

**Why Slack's admin UX is the best template for Captain Hub:**

1. **Central dashboard for admin actions.** Slack provides a single admin dashboard where owners can: view all channels, manage members, see workspace analytics, and control settings. Everything is reachable from one page. The CaptainHub should follow this hub pattern.

2. **Three-dot menu for per-item actions.** Slack uses a consistent three-dot menu (kebab menu) on channels, members, and messages for contextual actions. This pattern is efficient for lists of items (roster members, matches) where each item has 2-3 possible actions.

3. **Channel Managers role.** Slack introduced "Channel Managers" -- users who can manage specific channels without being full workspace admins. This is interesting for VCLoL's future (e.g., designating a "match coordinator" who can manage match visibility without being captain) but is not needed at launch.

4. **Search and filter in admin.** Slack's admin dashboard includes search and filter for members and channels. The CaptainHub should include search for teams with many matches (>20) and eventually for rosters approaching the 15-member limit.

**VCLoL takeaway:**

- CaptainHub should be a single hub page with sections (not separate pages for roster, matches, settings). The current CaptainHub.tsx already follows this pattern -- it has sections for match visibility, roster, and settings.
- Use three-dot menus or inline action buttons for per-member and per-match actions.
- Add search/filter when match count or roster size exceeds comfortable scanning (>10 items).

---

### Platform Study: TeamSnap / SportsEngine (Sports Team Management)

**What:** Roster management, scheduling, communication, and availability tracking for youth and amateur sports teams.

**Who:** Coaches, team managers, parents. 25 million users on TeamSnap.

**When:** Season-long team management.

**Where:** Mobile-first apps.

**Why sports team apps are VCLoL's closest analog:**

1. **Roster is the center of gravity.** In TeamSnap, the roster view is the primary screen. Everything else (schedule, communication, availability) radiates from the roster. For VCLoL's CaptainHub, the roster should be visually prominent -- members are the team.

2. **Availability tracking.** TeamSnap's killer feature is RSVP for games -- each player marks available/unavailable for each event. VCLoL does not have scheduled events (scrims are ad-hoc) but the concept of "active vs. inactive" member status serves a similar purpose. The CaptainHub roster already shows active/inactive/pending status, which is correct.

3. **Drag-and-drop roster management.** TeamSnap allows dragging players between positions and between teams. VCLoL's role assignment (Top/Jungle/Mid/Bot/Support) in CaptainHub could benefit from drag-and-drop, but given the small roster size (5 starters + subs), inline dropdowns are sufficient.

4. **Communication integrated into management.** TeamSnap includes in-app messaging from the roster view. VCLoL does not need this -- Discord IS the communication layer. The CaptainHub should link to Discord rather than duplicating messaging.

5. **Print roster / export.** TeamSnap supports printing rosters. VCLoL could offer "export team stats as image" for sharing in Discord -- a feature that aligns with the platform's viral loop.

**VCLoL takeaway:**

- Roster should be the most prominent section of CaptainHub (it currently competes with match visibility for attention).
- Active/Inactive/Pending status per member is correct and maps to TeamSnap's availability model.
- Do NOT add in-app messaging. Discord handles this.
- Consider "export team card as image" for Discord sharing -- this supports the viral loop.

---

### Team Management: Synthesis of Best Practices

| Principle | Evidence | VCLoL Application |
|-----------|----------|-------------------|
| Match existing mental models | Discord: VCLoL users already know roles/kick/ban | CaptainHub should feel like Discord server settings |
| Flat permission model | Discord 47 permissions = misconfiguration | Captain + Member only. No tiers. |
| Hub pattern (one page) | Slack: single admin dashboard | CaptainHub as sections on one page (current) |
| Roster as centerpiece | TeamSnap: roster is primary view | Make roster section visually dominant |
| Action-oriented over settings | Discord: do things, not configure things | Prominent action buttons per member/match |
| Automatic > manual | VCLoL .rofl auto-roster, Notion invite-by-link | Celebrate automatic roster building prominently |
| Status indicators | TeamSnap: availability, Discord: online status | Verified/unverified and active/inactive badges |
| No redundant messaging | TeamSnap in-app chat vs Discord | Link to Discord, do not duplicate |

---

## VCLoL Gap Analysis

### Comparing Against Current Implementation

#### Connect.tsx (RSO Flow)

| Aspect | Current State | Recommended State | Priority |
|--------|--------------|-------------------|----------|
| Copy/framing | "Verify Your Riot Account" | "Connect Your Riot Account" (warmer, OAuth-familiar language) | High |
| Value proposition | "unlock your competitive profile, champion stats, and match history" | Good, but add concrete numbers: "We found N matches you appeared in" | High |
| No-token fallback | Dead-end suggesting Discord login | Show platform value + two paths (Discord OAuth, direct RSO) | High |
| Success celebration | Toast notification on dashboard | Brief animation + expanded success card + clear next step | Medium |
| Error recovery | Error messages present but only suggest Discord | Add "Try again" button on recoverable errors | Medium |
| Pre-verification preview | None -- players must verify before seeing anything | Show locked/redacted stats preview before verification | High |

#### PlayerDashboard.tsx (Privacy Controls)

| Aspect | Current State | Recommended State | Priority |
|--------|--------------|-------------------|----------|
| Privacy radio buttons | Three options with brief descriptions | Three options with concrete "WHO sees WHAT" explanations | High |
| Preview mode | Not implemented | "Preview as visitor" button showing public-facing view | High |
| Consequence enumeration | Not shown | Show what changes when switching levels | Medium |
| Visual indicator | EyeOff/Eye icon on card header | Badge on profile showing current privacy level to the user | Low |
| RSO opt-in explanation | Banner says "Verify your Riot identity to unlock..." | Add "What becomes visible after RSO" info panel | Medium |

#### CaptainHub.tsx (Team Management)

| Aspect | Current State | Recommended State | Priority |
|--------|--------------|-------------------|----------|
| Roster prominence | Competes with Match Visibility section | Roster first, larger, with verification status prominent | Medium |
| Match visibility UX | Badge per match (public/private) | Inline toggle with consequence preview | Medium |
| Bulk actions | "Manage All Matches" link to sub-page | Checkboxes + bulk action bar on main page | Low |
| Empty states | "No matches yet" generic message | Educational empty state with /submit command and how-it-works | Medium |
| Auto-roster celebration | Info message about auto-adding | Celebration when new member auto-added from .rofl | Low |
| Team defaults | Settings section at bottom | Settings as collapsible section, less prominent than roster/matches | Low |

### Comparing Against Existing Research (docs/UI_UX_RESEARCH_2025.md)

The existing research document covers:

**Section 2.4 (Privacy States):** Recommends preview mode, visual indicators, just-in-time consent, centralized privacy dashboard. ALL of these recommendations remain valid and are reinforced by this research. The LinkedIn "View as" pattern and Facebook Groups simplification both support the existing recommendations.

**Section 5.2 (Contextual Navigation):** Recommends role-based navigation with Captain Hub as a contextual addition. This is validated by Discord and Slack's approach where admin tools are role-gated.

**Section 7.1 (First-Time User Experience):** Recommends onboarding checklist with 3-5 items. The current PlayerDashboard.tsx has a 3-step checklist for captains. This research adds: start the progress bar at 20%, show value before verification (Duolingo/Wise pattern), and celebrate each completion step more prominently.

**Section 7.2 (Empty States):** Already well-documented with VCLoL-specific empty state messages. No gaps identified.

**Section 7.3 (Progressive Onboarding):** Recommends different flows for visitor/player/captain/admin. This research reinforces the recommendation and adds that the captain flow should feel like Discord server setup (familiar mental model).

**New insights not in existing research:**
1. Deferred verification pattern (Wise/Duolingo): show value before requiring RSO
2. Concrete consequence enumeration (GitHub): show exactly what changes at each privacy level
3. Orthogonal concern separation (Facebook Groups): match visibility vs. profile visibility as independent axes
4. Sports team roster centrality (TeamSnap): roster should be the visual anchor of CaptainHub
5. "Login with [Platform]" framing (OAuth best practices): use familiar OAuth language, not "verification" language

---

## Synthesis: Design Recommendations

### 1. RSO Connect Flow Redesign

**Current flow:**
```
/connect in Discord -> bot sends link -> /connect?token=abc ->
click "Verify with Riot" -> redirect to Riot -> back to /dashboard?rso=success -> toast
```

**Recommended flow:**
```
/connect in Discord -> bot sends link -> /connect?token=abc ->
  Page shows: "Connect Your Riot Account"
  Below: "We found N matches where you appeared. Connect to claim your competitive profile."
  Button: "Connect with Riot" (shield icon, primary color)
  Below button: "You will be redirected to Riot Games. We only read your PUUID and Riot ID."
  -> redirect to Riot -> back to /dashboard?rso=success ->
  Success card with animation: "Welcome, xiNe#NA1! Your profile is now verified."
  Below: "3 matches claimed. Your career stats are now tracking."
  CTA: "View your profile" | "Set your privacy level"
```

**Key changes:**
- "Connect" not "Verify" (OAuth-familiar language)
- Show concrete value before the action (N matches found)
- More prominent success state with next-step CTAs
- Two paths after success: view profile OR set privacy (privacy opt-in happens immediately after verification when motivation is highest)

### 2. Privacy Controls Enhancement

**Current implementation:** Radio buttons with brief descriptions in PlayerDashboard.tsx.

**Recommended implementation:**

```
Profile Privacy card:
  [Current level indicator: eye/lock icon + "Your profile is currently PUBLIC"]

  Three options as cards (not radio buttons):
  [PUBLIC card]
    Icon: Eye (open)
    "Anyone Can View"
    "Scouts, coaches, and visitors can see your career stats, champion pool,
     and full match history. Your profile appears in search results."
    [Selected indicator if current]

  [PARTICIPANTS card]
    Icon: Users
    "Match Participants Only"
    "Only players who have been in a match with you can see your detailed stats.
     Your profile does not appear in search results."
    [Selected indicator if current]

  [PRIVATE card]
    Icon: EyeOff
    "You Only"
    "Only you can see your stats. Others see your Riot ID and team affiliations.
     Your profile does not appear in search results."
    [Selected indicator if current]

  [Preview as visitor] button -> opens modal/drawer showing public-facing view
  [Save] button
```

**Key changes:**
- Card-based selection instead of radio buttons (more visual, easier to scan)
- Concrete descriptions with WHO + WHAT + search implications
- "Preview as visitor" button for trust-building
- Current level shown prominently at top

### 3. CaptainHub Layout Reorganization

**Recommended section order (top to bottom):**

1. **Team Header** -- Team name, tag, W/L record, active status
2. **Roster** (largest section) -- Members with:
   - RSO verification status (green check or yellow warning)
   - Active/Inactive/Pending status
   - Role (Top/Jungle/Mid/Bot/Support)
   - Actions: change role dropdown, remove button (with confirmation)
   - Info banner: "Members are automatically added from submitted match replays"
3. **Recent Matches** -- Last 5 matches with:
   - Inline visibility toggle (public/private) per match
   - Opponent, result, date
   - "View all matches" link
4. **Team Settings** (collapsible) -- Default match visibility, transfer captain

**Key changes:**
- Roster moves to position #2 (currently fights for attention with match visibility)
- Match visibility becomes inline toggle per match (action-oriented, not settings-oriented)
- Team Settings is collapsible (used infrequently, should not dominate)
- Each section has appropriate empty states with educational CTAs

### 4. Onboarding Checklist Enhancement

**Current checklist (PlayerDashboard.tsx):** 3 steps for captains only, disappears when all complete.

**Recommended enhancements:**

For **all new players** (not just captains):
1. "Log in with Discord" -- [auto-completed, starts at 25%]
2. "Connect your Riot account" -- CTA: "Connect with Riot" button
3. "View your first match" -- CTA: link to their most recent match appearance

For **captains** (additional steps after player steps):
4. "Submit your first replay" -- CTA: instructions for /submit
5. "Set your team's default visibility" -- CTA: link to team settings

Progress bar starts at 25% (step 1 already done on login). Each step shows a green checkmark animation on completion. When all steps are done, the checklist collapses with a brief "All set!" message and does not reappear.

### 5. Error Recovery and Edge Cases

**RSO errors (Connect.tsx):**
- `invalid_token`: Add "Generate new link" CTA that explains /connect command
- `state_mismatch`: Add "Try again" button that retries the same token
- `token_exchange_failed`: Add "Wait 30 seconds, then try again" with a visible timer
- `server_error`: Add both "Try again" AND "Use /connect in Discord for a fresh link"
- All errors: Add a small "Need help?" link to a FAQ or Discord support channel

**Privacy change confirmation:**
- When switching from Private to Public: show a confirmation dialog listing what becomes visible
- When switching from Public to Private: instant (no confirmation needed -- restricting is safe)
- This mirrors GitHub's pattern where making things public has more guardrails than making things private

---

## Sources

### Identity Verification
- [Revolut & GBG Identity Verification Case Study](https://www.gbg.com/en/our-customers/revolut-v1/)
- [Fintech UX Best Practices 2026](https://www.eleken.co/blog-posts/fintech-ux-best-practices)
- [Revolut Partners Fourthline for KYC Tech](https://www.fintechfutures.com/biometrics-id-verification/revolut-partners-fourthline-for-kyc-tech)
- [Wise UX Flow](https://pageflows.com/ios/products/transferwise/)
- [Wise Design System](https://medium.com/transferwise-design/going-everywhere-meet-the-new-wise-design-system-863731563f71)
- [RSO (Riot Sign On) - Developer Relations](https://support-developer.riotgames.com/hc/en-us/articles/22801670382739-RSO-Riot-Sign-On)
- [OAuth Client Documentation - Riot](https://support-developer.riotgames.com/hc/en-us/articles/22897607341075-OAuth-Client-Documentation)
- [Riot Developer Portal - New Beta](https://www.riotgames.com/en/DevRel/the-new-developer-portal-beta)
- [Steam Guard Mobile Authenticator](https://help.steampowered.com/en/faqs/view/7EFD-3CAE-64D3-1C31)
- [Twitter Verification - Wikipedia](https://en.wikipedia.org/wiki/Twitter_verification)
- [FACEIT Verification Process](https://support.faceit.com/hc/en-us/articles/8493884798876-The-Verification-process)

### Onboarding & Activation
- [Duolingo UX and Onboarding Breakdown](https://userguiding.com/blog/duolingo-onboarding-ux)
- [Building Effective Onboarding: Lessons from Duolingo](https://medium.com/@kotarina832/building-effective-onboarding-experiences-lessons-from-duolingo-7aa2af536020)
- [Duolingo's Delightful Onboarding](https://goodux.appcues.com/blog/duolingo-user-onboarding)
- [The Aha Moment Guide](https://www.appcues.com/blog/aha-moment-guide)
- [100+ User Onboarding Statistics 2026](https://userguiding.com/blog/user-onboarding-statistics)
- [Onboarding Gamification Examples](https://www.strivecloud.io/blog/gamification-examples-onboarding)
- [User Onboarding Best Practices 2025](https://userguiding.com/blog/user-onboarding-best-practices)
- [SaaS Onboarding Best Practices 2025](https://www.flowjam.com/blog/saas-onboarding-best-practices-2025-guide-checklist)
- [Login & Signup UX: The 2025 Guide](https://www.authgear.com/post/login-signup-ux-guide)
- [Authentication Best Practices for Game Developers](https://mojoauth.com/blog/secure-authentication-best-practices-games)

### Privacy Controls
- [Instagram Privacy Settings Guide](https://www.comparitech.com/blog/vpn-privacy/instagram-privacy-settings/)
- [Managing Your Privacy Settings - Instagram Help](https://help.instagram.com/285881641526716)
- [UX for Privacy & Consent in 2025](https://medium.com/design-bootcamp/ux-for-privacy-consent-in-2025-designing-trust-in-a-digital-world-0e41906298e3)
- [LinkedIn Profile Visibility Settings](https://www.linkedin.com/help/linkedin/answer/a518980)
- [LinkedIn Privacy Guide 2026](https://www.leadcrm.io/blog/guide-to-linkedin-profile-privacy/)
- [What People Can See on Your LinkedIn Profile](https://www.linkedin.com/help/linkedin/answer/a545600/what-people-can-see-on-your-profile)
- [Preview LinkedIn Profile as Others See It](https://blog.linkboost.co/view-your-linkedin-profile-as-others-see-it-tips-on-editing-profiles-and-account-privacy/)
- [Facebook Groups Privacy Settings Simplified](https://about.fb.com/news/2019/08/groups-privacy-settings/)
- [Facebook Groups Privacy Settings Make Sense Now](https://thenextweb.com/news/facebooks-group-privacy-settings-actually-make-sense-now)
- [Public vs Private Facebook Groups](https://groupboss.io/blog/public-vs-private-facebook-group/)
- [GitHub: Setting Repository Visibility](https://docs.github.com/articles/setting-repository-visibility)
- [Privacy-Aware Design Framework - Smashing Magazine](https://www.smashingmagazine.com/2019/04/privacy-ux-aware-design-framework/)

### Team Management
- [Discord Roles and Permissions](https://support.discord.com/hc/en-us/articles/214836687-Discord-Roles-and-Permissions)
- [Discord Role Permissions Guide 2025](https://blog.devvyy.xyz/blog/2025/discord/definitive-discord-role-permissions-guide-2025-edition/)
- [Discord View Server As Role](https://support.discord.com/hc/en-us/articles/360055709773-View-Server-As-Role-Permission-Guide)
- [Notion: Manage Members & Guests](https://www.notion.com/help/add-members-admins-guests-and-groups)
- [Notion: Sharing & Permissions](https://www.notion.com/help/sharing-and-permissions)
- [Notion: Teamspaces](https://www.notion.com/help/intro-to-teamspaces)
- [Slack: Workspace Administration](https://slack.com/help/categories/200122103-Workspace-administration)
- [Slack: Channel Management Tools](https://slack.com/help/articles/360047512554-Use-channel-management-tools)
- [Slack: Types of Roles](https://slack.com/help/articles/360018112273-Types-of-roles-in-Slack)
- [TeamSnap Team Management](https://www.teamsnap.com/teams)
- [Best Sports Team Management Apps 2025](https://www.spond.com/en-us/news-and-blog/5-best-sports-team-management-apps/)
- [Best Sports Team Management Apps Comparison](https://www.jerseywatch.com/blog/best-sports-team-management-software)
