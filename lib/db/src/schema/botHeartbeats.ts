import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";

export const botHeartbeatsTable = pgTable("bot_heartbeats", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
export type BotHeartbeat = typeof botHeartbeatsTable.$inferSelect;
