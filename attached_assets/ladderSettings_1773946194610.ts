import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const ladderSettingsTable = pgTable("ladder_settings", {
  id: serial("id").primaryKey(),
  kFactor: integer("k_factor").notNull().default(32),
  minMatchesForDisplay: integer("min_matches_for_display").notNull().default(4),
  playoffSize: integer("playoff_size").notNull().default(8),
  playoffFormat: text("playoff_format").notNull().default("single_elimination"),
  defaultMatchFormat: text("default_match_format").notNull().default("BO1"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type LadderSettings = typeof ladderSettingsTable.$inferSelect;
