# Phase 1: Schema Sync & Auth Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 01-schema-sync-auth-hardening
**Areas discussed:** eloHistory decision

---

## Gray Areas Presented

| Area | Description | Selected |
|------|-------------|----------|
| Schema sync 策略 | drizzle-kit push vs migrate, backup, other missing columns | |
| OAuth state 實作 | CSRF state param storage, Discord + RSO flows | |
| CORS 政策 | Allowed origins, dev vs production, credentials | |
| eloHistory 決定 | playerId column — add back or update docs | ✓ |

**User selected:** eloHistory only. Other areas deferred to Claude's discretion.

---

## eloHistory Decision

**Context provided to user:**
- SCHEMA_CONTRACT.md says keep `playerId` for backward compat
- Actual schema (eloHistory.ts) already removed it — only has `teamId`
- PRD v3.1: Team ELO only, player = resume model

**User asked for clarification:** "我想徹底清楚個流程 PLAYERID其實有咩用? 同埋你有無考慮清楚我成個PROJECT既目標同使用流程?"

**Full analysis provided:**
1. ELO belongs to teams, not players (PRD §8)
2. Player-match relationships available via JOIN: `elo_history → matchId → match_players → playerId`
3. Two future scenarios analyzed:
   - "Which players were in a match when ELO changed?" → JOIN handles this
   - "Individual player ELO?" → PRD explicitly excludes this
4. Keeping unused column causes confusion for future developers

| Option | Description | Selected |
|--------|-------------|----------|
| 更新文件刪 playerId | Update SCHEMA_CONTRACT.md to match code. JOIN covers all relationships. | ✓ |
| 加回 playerId | Add nullable playerId back to schema. Denormalize but violates PRD. | |
| 我仍然有問題 | Continue discussing | |

**User's choice:** 更新文件刪 playerId
**Notes:** User wanted thorough understanding of the full ELO flow and project goals before deciding. Satisfied after seeing JOIN-based query path and PRD alignment.

---

## Claude's Discretion

- Schema sync strategy (push vs migrate, backup)
- OAuth state parameter implementation
- CORS policy configuration
- Session secret validation
- Match visibility endpoint fix

## Deferred Ideas

None
