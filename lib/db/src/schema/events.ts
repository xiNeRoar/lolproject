import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  format: text("format").notNull(),
  eventDate: text("event_date").notNull(),
  registrationStatus: text("registration_status").notNull().default("open"),
  shortDescription: text("short_description").notNull(),
  fullDescription: text("full_description"),
  rulesSummary: text("rules_summary"),
  discordUrl: text("discord_url"),            // optional Discord invite URL for event (#115)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
