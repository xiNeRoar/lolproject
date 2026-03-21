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
**Status:** ✅ Implemented by Claude in commit 7e8c637. Verified 2026-03-21 (post-merge):
- `notifications` schema has `entityId: integer("entity_id")` column
- `notifyPlayer()` accepts optional 5th arg `entityId?: number`
- `db.insert()` spreads `{ entityId }` when provided
- **Frontend can now link match_result notifications directly to `/matches/:id`**
