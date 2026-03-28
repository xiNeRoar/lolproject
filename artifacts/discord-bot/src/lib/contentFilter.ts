/**
 * Content moderation for team names and tags.
 *
 * Uses a curated blocklist of English slurs, racial/ethnic slurs, sexual
 * terms, and other offensive content. Checks case-insensitive substring
 * match with whitespace/separator normalization.
 *
 * Baseline filter. Admin review via admin_actions log is the second line
 * of defense for creative circumventions.
 */

const BLOCKED_TERMS: string[] = [
  // Racial/ethnic slurs
  "nigger", "nigga", "nigg3r", "n1gger", "n1gga", "chink", "ch1nk",
  "gook", "g00k", "spic", "sp1c", "wetback", "kike", "k1ke",
  "beaner", "coon", "c00n", "darkie", "jigaboo",
  "raghead", "sandnigger", "towelhead", "zipperhead",
  // Homophobic/transphobic
  "faggot", "f4ggot", "fag", "f4g", "dyke", "tranny",
  // Sexual
  "cunt", "c0ck", "d1ck", "pussy", "p0rn", "cum", "jizz",
  // Nazi/white supremacy
  "nazi", "n4zi", "heil", "h3il", "1488", "14words",
  "whitepower",
  // General profanity (strong)
  "fuck", "fck", "fuk", "phuck", "shit", "sh1t", "bitch", "b1tch",
  "asshole", "a55hole",
  // Leetspeak evasions
  "f@g", "n!gger", "n!gga",
];

/**
 * Check if a string contains any blocked terms.
 * @returns The matched term, or null if clean.
 */
export function checkOffensiveContent(input: string): string | null {
  const lower = input.toLowerCase().replace(/[\s_\-\.]/g, "");

  for (const term of BLOCKED_TERMS) {
    const normalized = term.replace(/[\s_\-\.]/g, "");
    if (lower.includes(normalized)) {
      return term;
    }
  }

  return null;
}
