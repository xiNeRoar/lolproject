const ELO_K_FACTOR = 32;
const ELO_BASE = 1000;

/**
 * Standard Elo rating calculation.
 * Returns the new Elo rating for a team after a match.
 */
export function calculateElo(
  playerElo: number,
  opponentElo: number,
  won: boolean,
  kFactor: number = ELO_K_FACTOR
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const score = won ? 1 : 0;
  return Math.round(playerElo + kFactor * (score - expected));
}

/**
 * Soft ELO reset between seasons.
 * Compresses ELO toward baseline — preserves relative rank while
 * narrowing the spread to give all teams a fresh start.
 */
export function softResetElo(currentElo: number, factor: number = 0.5): number {
  return Math.round(ELO_BASE + (currentElo - ELO_BASE) * factor);
}

/**
 * Minimum matches required to appear on the public ladder.
 */
export const LADDER_MIN_MATCHES = 4;

/**
 * Playoff qualification: top N teams by ELO at season end.
 * Uses 8 when teamCount >= 16, otherwise 4.
 */
export function getPlayoffSize(teamCount: number): number {
  return teamCount >= 16 ? 8 : 4;
}
