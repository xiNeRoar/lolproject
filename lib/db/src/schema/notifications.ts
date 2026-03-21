import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityId: integer("entity_id"),  // e.g. matchId for match_result, eventId for event notifications
  isRead: boolean("is_read").notNull().default(false),
  dmSent: boolean("dm_sent").notNull().default(false),
  dmFailed: boolean("dm_failed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Notification = typeof notificationsTable.$inferSelect;
