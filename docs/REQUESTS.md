# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---

## Request: Add entityId to match_result notifications
**Needed for:** Issue #42
**Endpoint:** POST /api/notifications (when creating match_result type)
**Why:** Dashboard notifications of type `match_result` currently don't carry the matchId. Frontend needs this to link the notification directly to the match detail page instead of the player profile.
**Current behavior:** Notification body has `{ type: "match_result", title, message }` — no reference to which match.
**Requested change:** Include `entityId: matchId` (or `metadata: { matchId }`) in the notification payload when type is `match_result`.
**Frontend fallback:** Until this is implemented, frontend will link to the player's team profile as a reasonable fallback.
**Status:** ⚠️ #54 was closed by Claude but NOT actually implemented. Verified 2026-03-21:
- `notifications` table schema has NO `entityId` column
- `notifyPlayer()` function signature unchanged (4 args, no entityId)
- `db.insert(notificationsTable).values()` does NOT include entityId
- Frontend still uses team profile fallback. **This request remains open.**
