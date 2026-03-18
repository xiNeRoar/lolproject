import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { playersTable } from "./players";
import { matchesTable } from "./matches";

export const vodEntriesTable = pgTable("vod_entries", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "set null" }),
  matchId: integer("match_id").references(() => matchesTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  format: text("format"),
  playerNames: text("player_names"),
  roleTag: text("role_tag"),
  notes: text("notes"),
  videoUrl: text("video_url").notNull(),
  playerId: integer("player_id").references(() => playersTable.id, { onDelete: "set null" }),
  champion: text("champion"),
  opponentChampion: text("opponent_champion"),
  // position is nullable now; will be required for 5v5 use cases in future
  position: text("position"),
  patch: text("patch"),
  playerEloAtTime: integer("player_elo_at_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVodEntrySchema = createInsertSchema(vodEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVodEntry = z.infer<typeof insertVodEntrySchema>;
export type VodEntry = typeof vodEntriesTable.$inferSelect;
