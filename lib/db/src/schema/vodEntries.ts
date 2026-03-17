import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";

export const vodEntriesTable = pgTable("vod_entries", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  format: text("format"),
  playerNames: text("player_names"),
  roleTag: text("role_tag"),
  notes: text("notes"),
  videoUrl: text("video_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVodEntrySchema = createInsertSchema(vodEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVodEntry = z.infer<typeof insertVodEntrySchema>;
export type VodEntry = typeof vodEntriesTable.$inferSelect;
