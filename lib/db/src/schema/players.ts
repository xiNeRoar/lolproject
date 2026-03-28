import { pgTable, serial, text, varchar, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  riotId: text("riot_id").notNull().unique(),
  discordUsername: text("discord_username").notNull(),
  currentElo: integer("current_elo").notNull().default(1000),
  peakElo: integer("peak_elo").notNull().default(1000),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  discordId: text("discord_id"),
  puuid: varchar("puuid", { length: 78 }),
  rsoOptIn: boolean("rso_opt_in").notNull().default(false),
  email: text("email"),
  notificationPreference: text("notification_preference").notNull().default("web"),
  registrationStatus: text("registration_status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
