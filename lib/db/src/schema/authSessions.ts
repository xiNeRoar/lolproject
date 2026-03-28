import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const authSessionsTable = pgTable("auth_sessions", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  discordId: text("discord_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  completedAt: timestamp("completed_at"),
  puuid: text("puuid"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type AuthSession = typeof authSessionsTable.$inferSelect;
