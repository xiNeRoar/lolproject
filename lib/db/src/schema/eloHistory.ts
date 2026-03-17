import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { matchesTable } from "./matches";

export const eloHistoryTable = pgTable("elo_history", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  elo: integer("elo").notNull(),
  delta: integer("delta").notNull().default(0),
  matchId: integer("match_id").references(() => matchesTable.id, { onDelete: "set null" }),
  reason: text("reason").notNull().default("match"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type EloHistory = typeof eloHistoryTable.$inferSelect;
