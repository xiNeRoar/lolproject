import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { playersTable } from "./players";
import { teamsTable } from "./teams";

export const eventRegistrationsTable = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "cascade" }).notNull(),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  riotId: text("riot_id").notNull(),
  discordUsername: text("discord_username").notNull(),
  currentRank: text("current_rank").notNull(),
  city: text("city").notNull(),
  availabilityConfirmation: text("availability_confirmation").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("registered"),
  playerId: integer("player_id").references(() => playersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrationsTable).omit({ id: true, createdAt: true });
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventRegistration = typeof eventRegistrationsTable.$inferSelect;
