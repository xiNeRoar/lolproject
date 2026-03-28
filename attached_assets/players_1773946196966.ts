import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  riotId: text("riot_id").notNull().unique(),
  discordUsername: text("discord_username").notNull(),
  discordId: text("discord_id"),
  puuid: text("puuid"), // from .rofl PUUID field, nullable until verified
  primaryRole: text("primary_role"), // top, jg, mid, adc, sup
  secondaryRole: text("secondary_role"),
  isActive: boolean("is_active").notNull().default(true),
  email: text("email"),
  notificationPreference: text("notification_preference").notNull().default("web"),
  registrationStatus: text("registration_status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
