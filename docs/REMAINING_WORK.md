# VCLoL — Remaining Work (Post C1–C24)

All C1–C24 backend tasks from CLAUDE.md are DONE and pushed to GitHub.

This file lists everything the PRD requires that is NOT yet implemented, with clear assignment.

---

## How to read this file

- **Claude** = backend work (schema, Express routes, API endpoints, business logic)
- **Replit** = frontend work (React components, UI, pages, styling, navigation)
- **Both** = Claude does backend first, then Replit wires it into UI
- Priority follows PRD Section 5 MoSCoW

---

## MUST HAVE (PRD says MVP is broken without these)

### M1: vod_entries needs matchId FK
**Who:** Claude (schema + backend)
- Add `matchId` integer FK to `vod_entries` table referencing `matches.id`
- Update OpenAPI `VodEntry` schema to include `matchId`
- Run codegen
- Update `replays.ts` PATCH (C18 auto-create VODs) to set `matchId` when creating VOD entries
- This unblocks: M2, M3, M5, M7

### M2: MatchDetail shows all related VODs
**Who:** Both (Claude: backend endpoint, Replit: UI)
- Claude: In `matches.ts` GET `/:id`, query `vod_entries` where `matchId = id`, return as `vods[]` in response
- Replit: MatchDetail page renders VOD list (player A POV + player B POV cards)

### M3: VOD → Match navigation
**Who:** Replit (frontend only, once M1 is done)
- VodDetail page: if `vod.matchId` exists, show "View Match" link to `/matches/{matchId}`
- VOD cards everywhere: show match context badge

### M4: matches table additions from PRD
**Who:** Claude (schema)
- Add `gameId` text field (from LCU, for verification) — already exists on challenges but not on matches
- Add `resultSource` text field: `lcu_auto | rofl_parse | admin_manual` (default: `admin_manual`)
- Update OpenAPI, run codegen

### M5: players table — registrationStatus field
**Who:** Claude (schema)
- Add `registrationStatus` text field: `pending_verification | active | suspended` (default: `active`)
- PRD Section 4.1 requires this for the registration flow

---

## SHOULD HAVE (Important but not MVP-blocking)

### S1: Player Profile — Events participated + placement
**Who:** Both
- Claude: New endpoint `GET /api/players/:id/events` — query registrations + matches for this player, compute placement per event
- Replit: PlayerProfile page adds "Events" section with event name, date, placement

### S2: Player Profile — Champion pool
**Who:** Both
- Claude: New endpoint `GET /api/players/:id/champions` — aggregate from vod_entries (champion field) for this player, return champion + count + winrate
- Replit: PlayerProfile page adds "Champion Pool" section with champion icons + stats

### S3: Ladder — Most played champion per player
**Who:** Both
- Claude: Ladder endpoint returns `topChampion` per player (aggregate from vod_entries or matches)
- Replit: Ladder row shows champion icon next to player name

### S4: Ladder — Playoff zone divider line
**Who:** Replit (frontend only)
- Read `ladderSettings.playoffSize` from API (already returned)
- Render visual divider line after row N (where N = playoffSize)
- Highlight rows above the line

### S5: Ladder — Season end date countdown
**Who:** Replit (frontend only)
- Ladder already returns `season.endDate`
- Render countdown timer or "X days remaining" badge

### S6: Ladder — Challenge button on rows
**Who:** Replit (frontend only)
- Each ladder row (except own) shows "Challenge" button
- Button opens ChallengeModal (already exists)
- Button disabled when player's weekly challenge limit reached (check via ladderSettings)

### S7: H2H record between players
**Who:** Both
- Claude: New endpoint `GET /api/players/:idA/h2h/:idB` — count wins/losses between two players from matches table
- Replit: Show H2H record on ChallengeModal before sending challenge, and on MatchDetail

### S8: Event winner podium display
**Who:** Both
- Claude: On event complete, record winner/runner-up in a new field or via season_champions
- Replit: EventDetail page shows podium section (1st, 2nd, 3rd) at top when event is completed

### S9: MatchDetail shows all related VODs
**Who:** Replit (frontend, once M1+M2 backend done)
- Render VOD cards for each POV (Player A, Player B)
- Show "No VODs yet" if none exist

### S10: VOD Archive — player filter UI
**Who:** Replit (frontend only)
- Backend already supports `?playerId=X` query param on `GET /api/vods`
- Add player search/dropdown filter in VOD Archive page UI

### S11: Player Profile — opponent names as clickable links in match history
**Who:** Replit (frontend only)
- Backend already returns `playerARiotId` / `playerBRiotId` in recent matches (C14 done)
- Wrap opponent name in `<Link href="/player/{riotId}">`

### S12: MatchDetail — show round/bracket context
**Who:** Replit (frontend only)
- Backend already returns `round`, `bracketSlot`, `isPlayoff` fields
- Display "Quarter Final", "Semi Final", "Grand Final" labels based on round number

---

## COULD HAVE (Nice to have, Phase 2)

### C1: Global search (players, VODs, events)
**Who:** Both
- Claude: `GET /api/search?q=term` endpoint searching across players, events, vods
- Replit: Search bar in nav, results dropdown

### C2: Recent activity feed
**Who:** Both
- Claude: `GET /api/activity` endpoint — recent matches, challenges, registrations
- Replit: Activity feed component on Home page or dedicated page

### C3: Rank distribution display
**Who:** Both
- Claude: `GET /api/ladder/distribution` — count players per ELO bracket
- Replit: Chart on About or Ladder page

### C4: Series-level match data (BO3/BO5 individual games)
**Who:** Both (significant schema work)
- Claude: New `match_games` table linking individual games to a match series
- Replit: MatchDetail shows game-by-game breakdown

### C5: Platform activity signal on homepage
**Who:** Replit (frontend only)
- Show "X active players this season", "Last match played X hours ago"
- Data available from existing endpoints

### C6: Ladder — "Last active" indicator
**Who:** Both
- Claude: Include `lastMatchDate` in ladder response (max createdAt from matches for each player)
- Replit: Show relative time since last match on ladder rows

---

## WON'T HAVE (Now) — from PRD Section 5

- 5v5 team ladder
- Real-time spectating for viewers
- In-platform voice/chat
- Mobile app
- Paid features / subscriptions
- Auto-matchmaking (UI stub exists, backend Phase 2)

---

## Execution Order

**Round 1 — Claude backend fixes (do first):**
M1 → M2 → M4 → M5

**Round 2 — Replit frontend (after Claude round 1):**
M3, S4, S5, S6, S10, S11, S12

**Round 3 — Both (new features):**
S1, S2, S3, S7, S8

**Round 4 — Phase 2:**
C1–C6
