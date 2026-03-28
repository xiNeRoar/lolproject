---
status: complete
phase: 02-privacy-gates
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-03-27T08:35:00.000Z
updated: 2026-03-27T09:00:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. privacyGate.ts shared helpers exist
expected: 6 exported functions: checkMatchParticipant, isMatchVisibleTo, redactMatchForNonParticipant, filterMatchPlayersByOptIn, isPlayerProfileVisibleTo, checkCoParticipant.
result: pass

### 2. matches.ts uses shared privacyGate helpers
expected: isMatchVisibleTo called 3x, redactMatchForNonParticipant and filterMatchPlayersByOptIn used. Old inline isVisible/isMemberOfMatch removed.
result: pass

### 3. isRedacted flag in redaction response
expected: redactMatchForNonParticipant returns isRedacted: true (not _private).
result: pass

### 4. Participant check uses match_players table
expected: checkMatchParticipant queries matchPlayersTable, NOT teamMembersTable. 0 references to teamMembersTable in privacyGate.ts.
result: pass

### 5. rsoOptIn filter on GET /players
expected: Non-admin requests filtered by rsoOptIn = true. Admin bypasses filter.
result: pass

### 6. isPlayerProfileVisibleTo on all profile routes
expected: Called on 4 profile routes (by-id, riotId, events, champions).
result: pass

### 7. VOD 7-day bug fixed
expected: Old isMatchPublic function deleted (0 references). vods.ts uses isMatchVisibleTo from shared privacyGate.
result: pass

### 8. Private profile returns isPrivate (not 403)
expected: Private profile response includes isPrivate: true with team memberships.
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
