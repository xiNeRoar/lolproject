# Research Summary: VCLoL RSO + Privacy Gates + Career Resume

**Domain:** 5v5 LoL scrim recording platform -- identity verification, privacy compliance, career statistics
**Researched:** 2026-03-26
**Overall confidence:** HIGH

## Executive Summary

VCLoL is a brownfield TypeScript monorepo (~25k+ lines) with a functional Discord bot and website. The core infrastructure works: .rofl parsing, match recording, team management, admin panel, and Discord OAuth login. What remains for launch is RSO (Riot Sign On) OAuth hardening, privacy-gated API responses for Riot policy compliance, and the per-team career resume that is the platform's core differentiator.

The RSO OAuth flow is already implemented and architecturally correct. The codebase correctly uses `https://auth.riotgames.com/authorize` with `openid offline_access` scopes, exchanges codes at `https://auth.riotgames.com/token`, and retrieves PUUIDs via `https://americas.api.riotgames.com/riot/account/v1/accounts/me`. Both bot-initiated (/connect token) and website-initiated (Discord session first) paths exist. The security hardening gaps (CSRF state parameter, token encryption, CORS restriction) are well-understood fixes that do not require architectural changes.

The privacy gate pattern is partially implemented. Player profile visibility (public/private/participants-only) works with inline route-level checks. Match detail visibility has the `isVisible()` helper but has a critical divergence with `vods.ts` where scrims leak after 7 days. The fix is extracting a single shared visibility function. No new libraries or middleware frameworks are needed -- the existing inline pattern is correct for VCLoL's 3-access-level model.

Career resume (per-team W/L + KDA) requires a new aggregation query joining `match_players`, `matches`, `team_members`, and `teams` with GROUP BY team_id. The schema already supports this. The main pitfall is double-counting stats for players on multiple teams that play each other -- resolved by using the `teamSide` field in `match_players` to scope the join correctly. No new dependencies needed.

## Key Findings

**Stack:** Zero new dependencies required. All features use existing Express + Drizzle + Node.js crypto. The recommendation against adding Passport.js, RBAC libraries, or caching layers is deliberate -- VCLoL's scale (25 teams, 200 matches in 6 months) does not justify the complexity.

**Architecture:** Route-level privacy gates (not middleware), shared helper functions extracted to `lib/privacyGate.ts` and `lib/careerStats.ts`, RSO token encryption via `lib/rsoTokens.ts`.

**Critical pitfall:** RSO tokens stored as plaintext AND RSO access tokens expire in 10 minutes with no refresh logic. The pragmatic fix: stop storing tokens entirely since VCLoL only needs the PUUID (extracted at auth time). If future features need tokens, encrypt with AES-256-GCM and implement refresh with rotation handling.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Security Hardening** - Fix security issues before any RSO flow goes to production
   - Addresses: OAuth CSRF state parameter, CORS restriction, session secret hardening, visibility bypass via request body
   - Avoids: Account takeover (Pitfall 2), session hijacking (Pitfall 7), visibility bypass (Pitfall 8)

2. **RSO Token Cleanup + Schema Sync** - Decide token storage strategy, sync missing columns
   - Addresses: Plaintext token storage (Pitfall 5), match_type column (#221), ELO-on-scrims bug (Pitfall 14)
   - Avoids: Data loss from schema push (Pitfall 3)

3. **Privacy Gates** - Implement match detail scrim privacy and extract shared visibility logic
   - Addresses: Match detail scrim privacy gate, visibility divergence between matches and vods (Pitfall 4), player search RSO filter
   - Avoids: Riot policy violation, scrim VOD leaking after 7 days

4. **Career Resume + Query Optimization** - Per-team stats and N+1 fix
   - Addresses: Per-team career resume, N+1 query fix (#217), player list pagination
   - Avoids: Double-counting for multi-team players (use teamSide field)

5. **OpenAPI Alignment + Frontend Integration** - Sync spec with all route changes, regenerate hooks
   - Addresses: OpenAPI spec drift, generated hooks mismatch
   - Avoids: Frontend 404s from stale generated code

**Phase ordering rationale:**
- Security hardening MUST come first -- these are exploitable vulnerabilities, not features
- Token strategy (store vs delete) must be decided before privacy gates reference token state
- Privacy gates must exist before career resume (resume respects visibility rules)
- OpenAPI update comes last because it captures all route changes at once (one codegen run)

**Research flags for phases:**
- Phase 1 (Security): Standard patterns, no additional research needed
- Phase 2 (Token/Schema): Needs decision -- recommend deleting token columns rather than encrypting
- Phase 3 (Privacy): Needs careful testing of edge cases (player left team but in match_players, tournament vs scrim visibility)
- Phase 4 (Career): May need deeper research on teamSide join correctness with real data

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Zero new dependencies. All recommendations use existing libraries verified in codebase. |
| RSO OAuth | HIGH | Endpoints and scopes verified against official Riot docs and community implementation gist. Existing code is architecturally correct. |
| Privacy Gates | HIGH | Pattern already established in codebase. Divergence bug (matches vs vods visibility) confirmed by direct code comparison. |
| Career Resume | MEDIUM | Query pattern is sound but per-team join with multi-team players needs validation with real data. teamSide-based scoping is the theoretical fix. |
| Pitfalls | HIGH | All critical pitfalls verified by direct codebase inspection. Security issues confirmed against OWASP and OAuth2 spec. |

## Gaps to Address

- **RSO production key timeline:** Riot approval process takes 12 hours to 4 months. Build with placeholder, but the timeline is outside VCLoL's control.
- **Token storage decision:** Research recommends deleting tokens (only PUUID needed), but if a future feature requires Riot API calls on behalf of users, tokens would need to be re-added with encryption and refresh logic. This should be an explicit decision point.
- **Session store migration:** In-memory sessions will cause user logout on every deploy. `connect-pg-simple` is the recommended fix but adds a table to manage. Acceptable for post-launch if deploys are infrequent.
- **Match list pagination:** Not currently tracked as an issue but needed before player count exceeds ~50 to avoid loading all matches on every page view.
- **Real-world testing of per-team career query:** The multi-team player edge case (same player on Team A and Team B facing each other) needs a test case with seed data.

## Sources

- [Riot OAuth Client Documentation](https://support-developer.riotgames.com/hc/en-us/articles/22897607341075-OAuth-Client-Documentation)
- [Riot RSO Overview](https://support-developer.riotgames.com/hc/en-us/articles/22801670382739-RSO-Riot-Sign-On)
- [RSO Implementation Gist (Henrik-3)](https://gist.github.com/Henrik-3/d6b631fb7c61821bc16b17cd347a3811)
- [Drizzle ORM Select Documentation](https://orm.drizzle.team/docs/select)
- Direct codebase analysis: auth.ts, matches.ts, players.ts, vods.ts, all schema files
