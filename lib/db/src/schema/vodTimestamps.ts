import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vodEntriesTable } from "./vodEntries";

export const vodTimestampsTable = pgTable("vod_timestamps", {
  id: serial("id").primaryKey(),
  vodId: integer("vod_id").notNull().references(() => vodEntriesTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  seconds: integer("seconds").notNull(),
  // type enables future auto-extraction from Replay API to slot into correct category
  type: text("type").notNull().default("manual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVodTimestampSchema = createInsertSchema(vodTimestampsTable).omit({ id: true, createdAt: true });
export type InsertVodTimestamp = z.infer<typeof insertVodTimestampSchema>;
export type VodTimestamp = typeof vodTimestampsTable.$inferSelect;
