import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const ladderSettingsTable = pgTable("ladder_settings", {
  id: serial("id").primaryKey(),
  kFactor: integer("k_factor").notNull().default(32),
  minMatchesForDisplay: integer("min_matches_for_display").notNull().default(4),
  maxChallengesPerWeek: integer("max_challenges_per_week").notNull().default(3),
  maxChallengesSameOpponentPerWeek: integer("max_challenges_same_opponent_per_week").notNull().default(1),
  challengeExpiryHours: integer("challenge_expiry_hours").notNull().default(48),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type LadderSettings = typeof ladderSettingsTable.$inferSelect;
