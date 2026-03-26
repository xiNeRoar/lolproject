# Feature Landscape

**Domain:** Competitive amateur LoL scrim recording platform with identity verification and privacy compliance
**Researched:** 2026-03-26

## Table Stakes

Features users expect. Missing = product feels incomplete or non-compliant.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| RSO identity verification (one-time OAuth) | Riot policy requires opt-in for custom game data display. FACEIT, OP.GG, and all approved Riot third-party apps use OAuth-based identity. Users expect "Login with Riot" the same way they expect "Login with Google." Without this, no custom match history can be shown publicly. | Medium | Launch blocker. Riot confirmed (July 2024 tweet) that custom lobby match history requires RSO clients, NOT API keys. Build with placeholder, swap credentials on approval. |
| Player opt-in privacy controls | Riot developer policy explicitly states: "all players must first sign up for their service to display their stats/gameplay data." OP.GG offers public/private/only-me. FACEIT profiles are public by default but platform-scoped (you signed up). VCLoL's 3-layer model exceeds industry standard. | Medium | Already designed in PRD v3.1. The conservative default-private approach is correct and Riot-compliant. |
| Match result recording with verified data | ScrimStats.gg, Games of Legends, and every serious competitive tracker uses authoritative data sources (API or replay files), not self-reported results. .rofl parsing is the integrity foundation. | Already built | Core differentiator that VCLoL already has. |
| Team profiles with W/L record | Every competitive platform (FACEIT, ESEA, PlayVS) shows team aggregate stats publicly. This is expected by captains and scouts. Team name, tag, roster, win/loss record. | Low | Already built. Ensure it works well without ELO (W/L is the primary metric for scrims). |
| Player career stats (aggregate KDA, champion pool, match count) | FACEIT shows K/D, headshot %, per-map stats. OP.GG shows champion pool, win rates, KDA. Players expect to see their performance summary. VCLoL's "resume model" (per-team stats) is the right framing. | Medium | PRD v3.1 specifies this. Needs implementation: career resume layout with per-team W/L + KDA. |
| Match detail page with 10-player scoreboard | Standard in every match tracker. OP.GG, FACEIT, and the LoL client itself show full 10-player stats for matches you participated in. The privacy gate (participants-only for scrims) is VCLoL-specific and correct. | Medium | Partially built. Needs v3.1 privacy gate: non-participants see Team A vs B + score only for scrims. Tournament matches fully public. |
| Search (teams and opt-in players) | FACEIT, OP.GG all have global search. Users expect to find teams and players. Player search must respect opt-in (Riot policy). | Low | Exists but needs opt-in filter for players. Team search unaffected. |
| Discord bot match submission | VCLoL's viral loop depends on Discord. 40,000+ players active in LoL scrim Discord servers. Bot submission is where users already are. | Already built | Core architecture decision, already validated. |
| Leaderboard (W/L based) | Every competitive platform has rankings. FACEIT has global/regional ELO leaderboards. For VCLoL scrims, W/L record is the appropriate metric. ELO leaderboard activates only with tournament data. | Low | Already built. Ensure empty state for ELO leaderboard is well-designed. |

## Differentiators

Features that set VCLoL apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| "Team play resume" (per-team career history) | No platform provides this. OP.GG = solo queue. FACEIT = individual ELO. VCLoL uniquely shows "played for Team X: 32W/18L, 3.2 KDA as mid" across multiple teams. This is the shareable URL scouts actually want. | Medium | Core differentiator. PRD section 4.2 nails this. Implementation priority should be high. |
| .rofl-parsed verified results (no self-reporting) | ScrimStats.gg tracks custom games but relies on API. VCLoL's .rofl parsing provides match data that cannot be fabricated -- champion, KDA, duration, winner extracted from Riot's own replay format. | Already built | Unique integrity guarantee. Marketing angle: "verified, not self-reported." |
| 3-layer privacy model | Most platforms are binary (public/private). VCLoL's scrim-private/opt-in-public/tournament-public model is more nuanced and Riot-compliant. Exceeds what FACEIT or OP.GG offer for privacy granularity. | Medium | Already designed. Needs frontend implementation of gates. |
| Automatic roster building from .rofl | No other platform auto-discovers teammates from replay files. Captain submits replay, teammates auto-identified via PUUID. Zero manual roster maintenance. | Already built | Huge UX advantage. Cross-server works automatically. |
| VOD archive linked to match records | Professional tools (Games of Legends) have VODs for pro matches. Having VODs for amateur scrims is rare and valuable for improvement. | High | VOD pipeline requires separate Windows PC infrastructure. Defer rendering pipeline, but the VOD display pages are already built. |
| Captain visibility controls (per-match, bulk, default) | Granular control over which matches are public. FACEIT has no equivalent because all ranked matches are inherently public. Scrim context requires this. | Low | Already built in Captain Hub. |
| Badges (win streak, veteran, season champion) | Gamification that FACEIT has (levels, achievements). Lightweight but motivating. VCLoL badges are scrim-appropriate (veteran=50 matches, win streak=5). | Low | Schema exists. Display implementation needed. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Player individual ELO/rating | PRD is clear: team ELO only. Player ELO creates toxicity, discourages experimentation in scrims, and doesn't match VCLoL's "resume" philosophy. FACEIT does individual ELO because they match individuals; VCLoL is team-based. | Career resume model: per-team W/L + KDA + champion pool. |
| Scrim matchmaking / LFG | Discord handles scheduling. 40,000+ players already use scrim Discord servers for finding opponents. Building matchmaking duplicates existing infrastructure and fragments the community. PRD section 17 explicitly excludes this. | Link to existing scrim Discord servers. Bot presence in those servers IS the distribution channel. |
| Scrim ELO (rating scrims) | Practice should not penalize experimentation. Opponents may not be in system. Can be gamed by choosing weak opponents. Industry standard (FACEIT, ESEA): practice never counts toward ranking. | W/L record for scrims. ELO only for tournament code + event matches. |
| Real-time chat | Discord handles all communication. Building chat duplicates Discord, adds moderation burden, and splits where conversations happen. | Keep Discord as the communication layer. Bot announcements in Discord channels. |
| Mobile app | Web-first. Target demographic uses desktop for LoL. Discord mobile handles notifications. Building a mobile app before the web platform is stable is premature. | Responsive web design for viewing stats on mobile. Submission stays bot-only (desktop). |
| Government ID verification | FACEIT requires passport/selfie because they handle cash prizes and need anti-smurf for ranked matchmaking. VCLoL uses RSO (Riot's own identity) which is sufficient for the use case. Adding ID verification adds friction, legal liability, and data storage burden. | RSO verification is the right level. PUUID is cryptographically verified by Riot. |
| Player-to-player messaging | Creates harassment vector. VCLoL is a record-keeping platform, not a social network. | Discord handles all player communication. |
| Automated opponent scouting / draft analysis | Tempting feature but violates the privacy-first philosophy. Showing opponent tendencies from private scrims would undermine trust. | Let scouts view opted-in profiles manually. |

## Feature Dependencies

```
RSO OAuth handler (website) --> Player opt-in toggle
RSO OAuth handler (website) --> Player search filter (only show opted-in)
RSO OAuth handler (website) --> Match detail privacy gate (participant check)

Match detail privacy gate --> Scrim match: participants-only stats
Match detail privacy gate --> Tournament match: public stats

Player opt-in toggle --> Player career resume (public visibility)
Player opt-in toggle --> Player search results

matches.matchType column (#221) --> Tournament vs scrim distinction
matches.matchType column (#221) --> ELO calculation (tournament only)
matches.matchType column (#221) --> Layer 3 visibility (tournament = public)

Team profile (W/L) --> Leaderboard (W/L sort)
Badge schema --> Badge display on profiles
```

## MVP Recommendation (v3.1 Launch)

Prioritize (launch blockers):
1. **RSO OAuth handler on website** -- Without this, no identity verification, no opt-in, no privacy compliance. Everything downstream depends on it.
2. **Match detail scrim privacy gate** -- Non-participants see Team A vs B + score only. Riot policy compliance.
3. **Player search opt-in filter** -- Hide non-opted players from search. Riot policy compliance.
4. **matches.matchType column sync** (#221) -- Tournament vs scrim distinction needed for Layer 3 visibility.

Prioritize (high value, post-blocker):
5. **Player career resume layout** -- Per-team W/L + KDA. The core differentiator that scouts want.
6. **Login flow RSO connect step** -- Smooth onboarding: Discord OAuth then RSO link in one flow.
7. **Badge display** -- Low effort, high engagement. Schema already exists.

Defer:
- **VOD rendering pipeline** -- Separate infrastructure (Windows PC). Display pages already built; rendering is independent milestone.
- **Tournament API integration** -- Depends on Riot production key. Build ELO system ready, activate when tournament codes are available.
- **Advanced analytics (per-champion win rates, role performance)** -- Nice to have, not launch requirement.

## Competitive Landscape Summary

| Platform | Identity | Privacy Model | Career Data | Match Data Source |
|----------|----------|---------------|-------------|-------------------|
| **FACEIT** | ID verification (passport/selfie) + Steam/game link | Profiles public by default (you opted in by signing up). Limited hide options. | Individual ELO, K/D, per-map stats, match history | Platform-hosted matches |
| **ESEA** | Steam account link, ID for payments | Public stats, minimal privacy controls | Individual stats, team history | Platform-hosted matches |
| **OP.GG** | Riot API (public data) + RSO for opt-in | Public/private/only-me via Riot settings | Solo queue stats, champion pool, match history | Riot API (ranked/normal) |
| **PlayVS** | School-based verification | School-scoped visibility | Season stats within school league | Platform-hosted matches |
| **ScrimStats.gg** | Riot API/RSO | Unclear (alpha product) | Team-focused scrim analytics | Custom game API + RSO |
| **VCLoL** | RSO (Riot Sign On) | 3-layer: scrim-private / opt-in-public / tournament-public | Per-team career resume (W/L + KDA + champions) | .rofl replay parsing (cannot be faked) |

**VCLoL's unique position:** The only platform combining .rofl-verified scrim records with a team-play career resume and Riot-compliant privacy. ScrimStats.gg is the closest competitor but targets professional/semi-pro coaches, not the amateur "missing middle" that VCLoL serves.

## Sources

- [Riot Games DevRel: Custom lobby match history via RSO clients](https://x.com/RiotGamesDevRel/status/1813983125376016853) -- HIGH confidence, primary source
- [RSO (Riot Sign On) Developer Relations](https://support-developer.riotgames.com/hc/en-us/articles/22801670382739-RSO-Riot-Sign-On) -- HIGH confidence
- [Riot General Policies for Developers](https://support-developer.riotgames.com/hc/en-us/articles/22698591841939-General-Policies) -- HIGH confidence
- [FACEIT Verification FAQ](https://support.faceit.com/hc/en-us/articles/8650124346780-Verification-FAQ) -- MEDIUM confidence
- [FACEIT Player Profiles features](https://faceitsync.com/en/features/player-profiles) -- MEDIUM confidence (third-party description)
- [OP.GG profile privacy settings](https://help.op.gg/hc/en-us/articles/31092128317721-How-to-set-profile-to-public-or-private) -- MEDIUM confidence
- [ScrimStats.gg](https://scrimstats.gg/) -- LOW confidence (alpha product, limited public info)
- [Esports Insider: The space between pro and amateur](https://esportsinsider.com/2021/04/why-esports-needs-competitive-gaming-platforms) -- MEDIUM confidence
