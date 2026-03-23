/**
 * Elo calculation for VCLoL team matches.
 * Copied from artifacts/api-server/src/lib/elo.ts to keep bot self-contained.
 * If the formula changes, update both files.
 */

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
 */
export function softResetElo(currentElo: number, factor: number = 0.5): number {
  return Math.round(ELO_BASE + (currentElo - ELO_BASE) * factor);
}
