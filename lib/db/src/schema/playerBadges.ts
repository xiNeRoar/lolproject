import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { seasonsTable } from "./seasons";

export const playerBadgesTable = pgTable("player_badges", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  badgeType: text("badge_type").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  seasonId: integer("season_id").references(() => seasonsTable.id, { onDelete: "set null" }),
});
export type PlayerBadge = typeof playerBadgesTable.$inferSelect;
