# Phase 2: Privacy Gates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 02-privacy-gates
**Areas discussed:** Scrim redaction, VOD 7-day bug, participants-only, UX friction

---

## Pre-Discussion Research

User requested Riot policy research before making redaction decisions. Spawned gsd-project-researcher to investigate:
- Riot's exact policy text on custom game data
- How other platforms (OP.GG, FACEIT, ScrimStats.gg, PlayVS) handle it
- Safest interpretation for RSO application

**Key finding:** No platform publicly displays custom game per-player data. Riot policy restricts "a player's match history" — team-level results likely not covered. New recommendation: split captain visibility control (team results vs per-player stats).

File: `.planning/research/RIOT_PRIVACY_RESEARCH.md`

---

## Scrim Redaction

| Option | Description | Selected |
|--------|-------------|----------|
| Conservative (Recommended) | Team names + score + date + duration. Player stats only for participants or RSO opted-in. | ✓ |
| Strict PRD | Team names + score only. No duration, no patch. | |
| Champions visible | Team names + score + metadata + champion picks (no player names). | |

**User's choice:** Conservative
**Notes:** User asked for Riot policy research first. Decision informed by research findings. Captain `/visibility public` now split: team-level vs player-level.

---

## VOD 7-day Bug

| Option | Description | Selected |
|--------|-------------|----------|
| Treat as private (Recommended) | visibleAfter null = private by default. Follows PRD v3.1 default. | ✓ |
| Treat as 7-day delay | Keep 7-day behavior. Violates PRD default = private. | |

**User's choice:** Treat as private

---

## participants-only

| Option | Description | Selected |
|--------|-------------|----------|
| Same-match (Recommended) | 10 players from same match can see each other. Like LoL client. | ✓ |
| Same-team | Only teammates can see each other. More restrictive. | |
| Both contexts | Match detail = same-match, profile = same-team. | |

**User's choice:** Same-match

---

## UX Friction

| Option | Description | Selected |
|--------|-------------|----------|
| Partial data + hint | Return team names + score + isRedacted flag. CTA: "Login to see full stats." | ✓ |
| 404/403 | Hard block. User doesn't know match exists. | |
| Full data + blur | Return all data marked restricted. Security concern. | |

**User's choice:** Partial data + hint
**Notes:** User emphasized "極度著重低 friction" across both Discord bot and web. Privacy gates should feel like reward unlocks.

---

## Claude's Discretion

- privacyGate.ts implementation details
- Query optimization for participant lookup
- Error messages
- Edge cases (deleted players, null teamIds)

## Deferred Ideas

None
