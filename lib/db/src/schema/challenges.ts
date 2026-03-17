import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { seasonsTable } from "./seasons";
import { matchesTable } from "./matches";

export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  challengerId: integer("challenger_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  challengedId: integer("challenged_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  scheduledTime: timestamp("scheduled_time"),
  seasonId: integer("season_id").references(() => seasonsTable.id, { onDelete: "set null" }),
  matchId: integer("match_id").references(() => matchesTable.id, { onDelete: "set null" }),
  gameId: text("game_id"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type Challenge = typeof challengesTable.$inferSelect;
