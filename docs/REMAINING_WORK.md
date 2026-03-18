# VCLoL — Remaining Work

All backend tasks (C1–C24 + M1–M5 + S1/S2/S3/S7) are DONE.

---

## What's done (backend)

| Task | Endpoint | Status |
|------|----------|--------|
| C1–C24 | All CLAUDE.md backend tasks | DONE |
| M1 | `vod_entries.matchId` FK | DONE |
| M2 | `GET /matches/:id` returns `vods[]` | DONE |
| M4 | `matches.gameId` + `resultSource` fields | DONE |
| M5 | `players.registrationStatus` field | DONE |
| S1 | `GET /api/players/:id/events` | DONE |
| S2 | `GET /api/players/:id/champions` | DONE |
| S3 | `GET /api/ladder` returns `topChampion` per player | DONE |
| S7 | `GET /api/players/:idA/h2h/:idB` | DONE |

Generated hooks available: `useGetPlayerEvents`, `useGetPlayerChampions`, `useGetPlayerH2H`

---

## Replit frontend work remaining

All backend endpoints and generated hooks are ready. The following UI work needs to be done. How to display the data is entirely up to Replit.

### From CLAUDE.md "Frontend Still Needed"

1. **Register.tsx** — Discord OAuth flow (Discord button as Step 1, RiotID as Step 2)
2. **PlayerDashboard match rows** — Upload Replay (.rofl) button with patch expiry indicator
3. **ManageVods** — Render Queue panel (pending/processing/failed jobs, retry button)
4. **ManageLadderSettings** — The 6 new fields (decline limits, no-show expiry, playoff config) are now persisted in backend; UI just needs to remove the force-cast
5. **PlayerDashboard pending challenges** — Decline button disabled state with quota message (backend returns 403 when limit reached)
6. **PlayerLogin** — Add "Dev Login →" link for testing

### New data now available that UI should use

7. **MatchDetail — VODs section**: `GET /matches/:id` now returns a `vods[]` array with all VODs linked to that match. UI should display them.

8. **VOD cards — match link**: Every VOD entry now has a `matchId` field. VOD cards and VodDetail can link back to the match.

9. **Ladder — top champion**: `GET /api/ladder` now returns `topChampion` (string, nullable) per player. Ladder rows can display it.

10. **Ladder — playoff zone**: Backend returns `ladderSettings.playoffSize`. UI can render a visual divider after row N.

11. **Ladder — season countdown**: Backend returns `season.endDate`. UI can show days remaining.

12. **Ladder — challenge button**: Each ladder row (except own) needs a Challenge button opening ChallengeModal.

13. **Player Profile — events participated**: New endpoint `GET /api/players/:id/events` returns event participations with wins/losses per event. Use `useGetPlayerEvents(id)`. Profile should show an "Events" section.

14. **Player Profile — champion pool**: New endpoint `GET /api/players/:id/champions` returns champion + game count sorted by frequency. Use `useGetPlayerChampions(id)`. Profile should show a "Champion Pool" section.

15. **Player Profile — opponent names as links**: Backend returns `playerARiotId`/`playerBRiotId` in recent matches. Opponent names should be clickable links to their profiles.

16. **H2H record**: New endpoint `GET /api/players/:idA/h2h/:idB` returns total matches, wins each, and match list. Use `useGetPlayerH2H(idA, idB)`. Show in ChallengeModal or MatchDetail.

17. **MatchDetail — round/bracket context**: Backend returns `round`, `bracketSlot`, `isPlayoff`. UI should display "Quarter Final", "Semi Final", etc.

18. **VOD Archive — player filter**: Backend supports `?playerId=X` on `GET /api/vods`. UI needs a player search/dropdown filter.

### Phase 2 (not urgent)

19. **Global search** — needs backend endpoint first (not built yet)
20. **Recent activity feed** — needs backend endpoint first (not built yet)
21. **Rank distribution** — needs backend endpoint first (not built yet)
22. **Series-level match data** — needs schema work first (not built yet)
