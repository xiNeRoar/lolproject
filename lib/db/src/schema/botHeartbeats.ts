import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const botHeartbeatsTable = pgTable("bot_heartbeats", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  lastBroadcastDate: text("last_broadcast_date"), // ISO date string e.g. "2026-03-23", null = never broadcast
});
export type BotHeartbeat = typeof botHeartbeatsTable.$inferSelect;
