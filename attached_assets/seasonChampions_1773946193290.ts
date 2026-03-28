import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { teamsTable } from "./teams";
import { seasonsTable } from "./seasons";

export const seasonChampionsTable = pgTable("season_champions", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasonsTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  teamName: text("team_name"), // denormalized for historical display
  finalElo: integer("final_elo").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type SeasonChampion = typeof seasonChampionsTable.$inferSelect;
