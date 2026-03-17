import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { playersTable } from "./players";
import { seasonsTable } from "./seasons";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "set null" }),
  matchTitle: text("match_title").notNull(),
  sideAName: text("side_a_name").notNull(),
  sideBName: text("side_b_name").notNull(),
  winnerName: text("winner_name").notNull(),
  score: text("score"),
  format: text("format"),
  vodUrl: text("vod_url"),
  playerAId: integer("player_a_id").references(() => playersTable.id, { onDelete: "set null" }),
  playerBId: integer("player_b_id").references(() => playersTable.id, { onDelete: "set null" }),
  playerAEloBefore: integer("player_a_elo_before"),
  playerAEloAfter: integer("player_a_elo_after"),
  playerBEloBefore: integer("player_b_elo_before"),
  playerBEloAfter: integer("player_b_elo_after"),
  seasonId: integer("season_id").references(() => seasonsTable.id, { onDelete: "set null" }),
  isPlayoff: boolean("is_playoff").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
