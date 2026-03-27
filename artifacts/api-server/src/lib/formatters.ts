/** Shared response formatters for API routes. */

import { matchesTable } from "@workspace/db";

/**
 * Format a match row for API responses.
 *
 * Returns the superset of all fields needed by any consumer. When `extra`
 * is omitted the team/event enrichment fields default to null, making
 * call sites that only have the raw match row (e.g. teams.ts) a zero-change
 * drop-in replacement.
 */
export function formatMatch(
  m: typeof matchesTable.$inferSelect,
  extra: {
    teamAName?: string | null;
    teamBName?: string | null;
    teamATag?: string | null;
    teamBTag?: string | null;
    eventTitle?: string | null;
    eventSlug?: string | null;
  } = {}
) {
  return {
    id: m.id,
    teamAId: m.teamAId ?? null,
    teamBId: m.teamBId ?? null,
    teamAName: extra.teamAName ?? null,
    teamBName: extra.teamBName ?? null,
    teamATag: extra.teamATag ?? null,
    teamBTag: extra.teamBTag ?? null,
    sideAName: m.sideAName,
    sideBName: m.sideBName,
    matchTitle: m.matchTitle,
    winnerName: m.winnerName,
    score: m.score ?? null,
    format: m.format ?? null,
    teamAEloBefore: m.teamAEloBefore ?? null,
    teamAEloAfter: m.teamAEloAfter ?? null,
    teamBEloBefore: m.teamBEloBefore ?? null,
    teamBEloAfter: m.teamBEloAfter ?? null,
    gameId: m.gameId ?? null,
    gameDuration: m.gameDuration ?? null,
    gameVersion: m.gameVersion ?? null,
    resultSource: m.resultSource,
    roflFilePath: m.roflFilePath ?? null,
    visibleAfter: m.visibleAfter?.toISOString() ?? null,
    seasonId: m.seasonId ?? null,
    eventId: m.eventId ?? null,
    eventTitle: extra.eventTitle ?? null,
    eventSlug: extra.eventSlug ?? null,
    isPlayoff: m.isPlayoff,
    round: m.round ?? null,
    bracketSlot: m.bracketSlot ?? null,
    nextMatchId: m.nextMatchId ?? null,
    isLosersBracket: m.isLosersBracket ?? null,
    groupId: m.groupId ?? null,
    matchType: m.matchType ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}
