import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { seasonsTable } from "./seasons";

export const seasonChampionsTable = pgTable("season_champions", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasonsTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  finalElo: integer("final_elo").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type SeasonChampion = typeof seasonChampionsTable.$inferSelect;
