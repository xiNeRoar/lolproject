import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const matchmakingQueueTable = pgTable("matchmaking_queue", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  eloMin: integer("elo_min"),
  eloMax: integer("elo_max"),
  status: text("status").notNull().default("waiting"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MatchmakingQueue = typeof matchmakingQueueTable.$inferSelect;
