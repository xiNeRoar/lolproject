# Riot Games Custom Match Data Privacy Research

**Researched:** 2026-03-26
**Overall Confidence:** MEDIUM-HIGH
**Purpose:** Inform VCLoL scrim visibility design and RSO production key application

---

## 1. Exact Riot Policy Text

### Primary Policy (League of Legends Game-Specific Policy)

The core policy statement, found on the Riot Developer Portal (docs/lol#game-policy) and confirmed via the @RiotGamesDevRel announcement on 2024-07-18:

> "Products may not publicly display a player's match history from the custom match queue unless the player opts in to share this specifically for League of Legends. Otherwise, a player's custom match data may only be made available to them using RSO."

**Source:** [Riot Developer Portal - LoL Docs](https://developer.riotgames.com/docs/lol), [RiotGamesDevRel Tweet (July 18, 2024)](https://x.com/RiotGamesDevRel/status/1813983125376016853)

### Supporting Context from the Same Announcement

- Custom lobby match history is accessible **only** via RSO clients, **NOT** via product API keys
- This was a new capability added in July 2024 -- before this date, custom match data was not accessible via the API at all

### Approved Use Cases (Production Keys)

From Riot's LoL game-specific policies:
- Running tournaments
- Training tools that allow players to view **their own** match histories and aggregate stats
- Looking For Game (LFG) tools
- Game overlays (static pre-game data)
- Official Ladder Leaderboards

### Unapproved Use Cases

- Publicly displaying custom match history without player opt-in
- Providing game-session-specific info previously unknown to the player
- Apps that dictate player decisions

### Production Key Application Requirements

From [Production Key Applications](https://support-developer.riotgames.com/hc/en-us/articles/22801383038867-Production-Key-Applications):
- Must demonstrate a fully functioning application with clear user flows
- Must show account creation, login pipeline, user experience
- Must include functionality requiring player opt-in to sharing data (via RSO)
- Must include a disclaimer that account linking makes player data public
- Review cycle: typically weekly, up to 3 weeks

**Confidence: HIGH** -- sourced from official Riot Developer Portal and official @RiotGamesDevRel communications.

---

## 2. What Does "Match History" Mean?

### Riot Does NOT Explicitly Define "Match History"

The policy uses the term "match history" without a formal definition. This is the key ambiguity.

### What the Match-V5 API Returns (i.e., What Riot Considers "Match Data")

The Match-V5 endpoint returns approximately 3,000 lines of JSON per match, including:

| Category | Fields |
|----------|--------|
| **Match metadata** | Match ID, game duration, patch version, queue type, map |
| **Per-participant data** | PUUID, champion, kills, deaths, assists, CS, items, summoner spells, runes, gold earned, damage dealt, vision score, win/loss |
| **Team-level data** | Team ID, win/loss, bans, objectives (dragons, barons, towers) |

### Interpretation: What Counts as "Match History"?

**Conservative reading (RECOMMENDED):** "Match history" = any per-player data from a custom match that could identify what a specific player did. This includes:
- Champion picks
- KDA
- Items built
- CS/gold
- Damage stats
- Any stat tied to a specific player's PUUID

**Moderate reading:** "Match history" = the record of matches a player participated in, including outcomes and detailed stats. Aggregate team-level results (Team A beat Team B, 1-0) without player identification might fall outside this definition.

**Liberal reading (NOT recommended):** "Match history" = only the list of matches themselves, not the detailed stats within. This is too risky for an RSO application.

### Is "Team A vs Team B, Score Only" Considered Match History?

**Analysis:** The policy says "a player's match history" -- the possessive "player's" suggests it is about data attributable to individual players. A team-level result ("Team Alpha beat Team Beta") without any individual player data attached is arguably NOT "a player's match history."

However, this is a gray area. If a viewer can infer which players were in the match (e.g., because team rosters are public), then even team-level results could indirectly reveal a player's match history.

**Confidence: MEDIUM** -- Riot does not provide a formal definition; this is interpretive analysis.

---

## 3. How Other Platforms Handle Custom Game Data

### OP.GG

**Custom game data: NOT displayed at all.**

From [OP.GG Help Center](https://help.op.gg/hc/en-us/articles/31089445595033-I-want-to-view-my-stats-for-custom-games):
- OP.GG retrieves data via the Riot API, which does not return custom game data for standard API keys
- Supported modes: Normal, Solo Ranked, Flex Ranked, ARAM, Co-op vs AI
- Custom games are explicitly excluded

**Confidence: HIGH** -- confirmed via official OP.GG help center.

### U.GG

**Custom game data: NOT displayed.**

U.GG uses the standard Riot API and shows Ranked, Normals, ARAM, and all standard modes. Custom games are not tracked because the API does not provide this data to standard API keys.

**Confidence: HIGH** -- consistent with API limitations, confirmed via U.GG FAQ.

### FACEIT (League of Legends)

**Model: All matches played through FACEIT are FACEIT-organized matches, not raw custom games.**

- FACEIT runs its own competitive queues; matches are organized through FACEIT's platform
- Match results are public on FACEIT by design (you opted in by playing on FACEIT)
- FACEIT uses Tournament Codes for LoL matches, making them organized/tournament matches, not raw customs
- Privacy is handled by the platform participation model: if you play on FACEIT, you consented to public display

**Key insight for VCLoL:** FACEIT avoids the custom match privacy issue entirely by using Tournament Codes, which makes matches "organized" rather than "custom queue."

**Confidence: MEDIUM** -- based on general FACEIT documentation and how Tournament Code matches work.

### ScrimStats.gg

**Model: Self-hosted analytics, not public display.**

- Alpha v1.0.0 launched circa late 2025
- Tracks stats from custom games
- Syncs with a **self-hosted dashboard** (private by design)
- Built for coaches, teams, and managers (internal team tool)
- Does NOT appear to publicly display any player data

**Key insight for VCLoL:** ScrimStats.gg sidesteps the policy entirely by being a private, self-hosted tool. Data never becomes "publicly displayed."

**Confidence: MEDIUM** -- limited public documentation available (alpha product).

### PlayVS

**Model: Competition Data is public by default for organized matches.**

From PlayVS Privacy Policy:
- "Competition Data" is visible to others on the Service by default
- Includes: player name, full name, photo/avatar, esports position, player statistics, gameplay highlights
- Does NOT include: email, payment details, birth date
- PlayVS operates as an **organized competition platform** (school/college esports)
- Players consent to public display by participating in PlayVS leagues

**Key insight for VCLoL:** PlayVS uses explicit participation consent. By signing up for PlayVS leagues, players agree to public display. This is similar to VCLoL's tournament/event model.

**Confidence: HIGH** -- sourced from official PlayVS privacy policy.

### Summary Table

| Platform | Custom Game Data | Privacy Model | Public Display |
|----------|-----------------|---------------|----------------|
| OP.GG | Not shown | N/A (API limitation) | No |
| U.GG | Not shown | N/A (API limitation) | No |
| FACEIT | N/A (uses Tournament Codes) | Opt-in by participation | Yes, for FACEIT matches |
| ScrimStats.gg | Tracked privately | Self-hosted, private | No |
| PlayVS | Organized matches only | Consent via registration | Yes, for league matches |

---

## 4. Analysis for VCLoL

### VCLoL's Situation is Unique

VCLoL parses .rofl replay files (not using the Riot API for match data retrieval). This is an important distinction:

1. **The policy says "Products may not publicly display a player's match history from the custom match queue"** -- this applies regardless of HOW you obtained the data (API, .rofl parsing, manual entry). The restriction is on public display, not data source.

2. **VCLoL already has a 3-layer privacy model** that aligns well with Riot's intent:
   - L1 Scrim: login + participant only (NOT public)
   - L2 RSO opt-in: player controls their public profile
   - L3 Tournament: public by design

### What VCLoL Can Safely Display Publicly (No Opt-In Required)

Based on policy analysis:

| Data | Public Display OK? | Rationale |
|------|-------------------|-----------|
| "Team Alpha vs Team Beta" (team names only) | **Likely YES** | Not "a player's match history" -- it is team-level organizational data |
| Win/loss score (1-0) | **Likely YES** | Team-level result, not per-player data |
| Match date | **Likely YES** | Administrative metadata |
| Match type (scrim/tournament) | **YES** | Not player data |

### What VCLoL MUST Restrict (Requires Player Opt-In)

| Data | Must Restrict? | Rationale |
|------|---------------|-----------|
| Champion picks per player | **YES** | Directly tied to individual player performance |
| KDA per player | **YES** | Individual performance stat |
| CS, gold, items per player | **YES** | Individual performance stat |
| Game duration | **Gray area** | Not per-player, but reveals match participation |
| Player names in match | **YES** | Reveals which players participated |
| Patch version | **Likely OK** | Generic metadata, not player-specific |

### The Critical Distinction: "Publicly Display" vs "Available to Participants"

The policy restricts **public display**. VCLoL's L1 privacy (login + participant only) is NOT public display. This means:

- Showing full match stats to authenticated participants who were in the match: **COMPLIANT**
- Showing full match stats to any logged-in user who was NOT in the match: **NON-COMPLIANT** (unless all 10 players opted in)
- Showing team-level results publicly: **Likely compliant** (gray area, conservative approach recommended)

---

## 5. Recommendation for VCLoL RSO Application

### Be Conservative. The Cost of Being Wrong is Your API Key.

**Recommended approach for the RSO application:**

#### Tier 1: Public (no auth required)
- Team names and team-level W/L record
- Match date and match type
- NO player names, NO champions, NO individual stats
- This is the "scoreboard in the lobby" level of information

#### Tier 2: Authenticated participant (RSO-verified, was in the match)
- Full match stats for all 10 players
- This is compliant: not "publicly displayed" and the player is viewing their own data

#### Tier 3: RSO opt-in (player explicitly opts in)
- Full match stats visible to non-participants
- Player profile with career stats
- This is the "player's match history publicly displayed WITH opt-in" path

#### Tier 4: Tournament/Event matches
- Public by design (use Tournament Codes)
- Full stats, ELO, everything
- Compliant because tournament matches are NOT custom queue matches

### Application Messaging

When applying for the RSO Production Key, emphasize:

1. **Privacy-first design:** Scrim data defaults to participant-only visibility
2. **RSO as the identity layer:** Player identity verified through RSO, not self-reported
3. **Explicit opt-in for public profiles:** Players must RSO-connect AND toggle public visibility
4. **Tournament separation:** Tournament matches (via Tournament Codes) are treated differently from scrims
5. **Captain-controlled team visibility:** Team captains can override match visibility, but individual player opt-in still required for per-player stats

### What VCLoL Already Gets Right

Looking at the existing CLAUDE.md privacy model:

| VCLoL Feature | Riot Compliance |
|---------------|----------------|
| L1 scrim = login + participant | COMPLIANT - not public display |
| L2 RSO opt-in = public profile | COMPLIANT - explicit opt-in |
| L3 tournament = public | COMPLIANT - tournament matches are public by design |
| Captain /visibility public | NEEDS REVIEW - captain should not be able to make individual player stats public without player opt-in |

### The One Thing to Fix

**Captain /visibility public for scrims:** Currently, a captain can set a scrim match to "public" which would show full stats. Under the policy, this should only make TEAM-LEVEL data public (score, team names). Individual player stats should still require each player's RSO opt-in, even if the captain sets the match to "public."

**Recommendation:** Split match visibility into:
- **Match result visibility** (captain-controlled): Team A vs Team B, score
- **Player stat visibility** (per-player opt-in): Champions, KDA, items, etc.

This way, a captain can make the match result public, but individual player performance data requires each player to have opted in via RSO.

---

## 6. Confidence Assessment

| Finding | Confidence | Source |
|---------|------------|--------|
| Core policy text ("Products may not...") | HIGH | Official Riot Developer Portal, @RiotGamesDevRel |
| "Match history" is not formally defined | HIGH | Verified absence in official docs |
| Team-level results are likely not "match history" | MEDIUM | Interpretive analysis of policy language |
| OP.GG/U.GG don't show custom game data | HIGH | Official help centers |
| FACEIT uses Tournament Codes (avoids issue) | MEDIUM | General FACEIT documentation |
| ScrimStats.gg is private/self-hosted | MEDIUM | Limited alpha product info |
| PlayVS uses consent-by-participation | HIGH | Official privacy policy |
| .rofl parsing subject to same display rules | MEDIUM | Policy restricts display, not data source (interpretive) |
| Captain visibility needs per-player opt-in for stats | MEDIUM | Conservative interpretation of policy |

---

## 7. Open Questions for Riot Developer Relations

If VCLoL wants definitive answers, these questions should be posed to Riot Developer Support:

1. **Does "match history" include team-level results (Team A beat Team B) without any player identification?**
2. **If match data comes from .rofl replay parsing (not the API), does the custom match display policy still apply?**
3. **Can a team captain opt-in on behalf of their team members for match result display, or must each player individually opt-in?**
4. **For a scrim platform where all participants are RSO-verified, does showing stats to other RSO-verified participants (who were NOT in the match) constitute "public display"?**

These can be submitted via the [Developer Support Portal](https://support-developer.riotgames.com).

---

## Sources

- [Riot Developer Portal - LoL Documentation](https://developer.riotgames.com/docs/lol)
- [Riot Developer Portal - General Policies](https://developer.riotgames.com/policies/general)
- [Riot Developer Portal - Game-Specific Policies](https://developer.riotgames.com/policies/game-specific)
- [RiotGamesDevRel Tweet - Custom Match History via RSO (July 18, 2024)](https://x.com/RiotGamesDevRel/status/1813983125376016853)
- [OP.GG Help - Custom Game Stats](https://help.op.gg/hc/en-us/articles/31089445595033-I-want-to-view-my-stats-for-custom-games)
- [Production Key Applications](https://support-developer.riotgames.com/hc/en-us/articles/22801383038867-Production-Key-Applications)
- [RSO Documentation](https://support-developer.riotgames.com/hc/en-us/articles/22801670382739-RSO-Riot-Sign-On)
- [PlayVS Privacy Policy](https://playvs.com/privacy/)
- [ScrimStats.gg](https://scrimstats.gg/)
- [League of Legends Developer Relations Support](https://support-developer.riotgames.com/hc/en-us/articles/22698698001939-League-of-Legends)
