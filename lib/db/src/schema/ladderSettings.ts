import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const ladderSettingsTable = pgTable("ladder_settings", {
  id: serial("id").primaryKey(),
  kFactor: integer("k_factor").notNull().default(32),
  minMatchesForDisplay: integer("min_matches_for_display").notNull().default(4),
  maxChallengesPerWeek: integer("max_challenges_per_week").notNull().default(3),
  maxChallengesSameOpponentPerWeek: integer("max_challenges_same_opponent_per_week").notNull().default(1),
  challengeExpiryHours: integer("challenge_expiry_hours").notNull().default(48),
  maxDeclinesPerWeek: integer("max_declines_per_week").notNull().default(2),
  maxDeclinesSameOpponentPerWeek: integer("max_declines_same_opponent_per_week").notNull().default(1),
  noShowExpiryDays: integer("no_show_expiry_days").notNull().default(7),
  playoffMinPlayers: integer("playoff_min_players").notNull().default(4),
  playoffSize: integer("playoff_size").notNull().default(8),
  playoffFormat: text("playoff_format").notNull().default("single_elimination"),
  defaultMatchFormat: text("default_match_format").notNull().default("BO1"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type LadderSettings = typeof ladderSettingsTable.$inferSelect;
