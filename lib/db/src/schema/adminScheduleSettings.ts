import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const adminScheduleSettingsTable = pgTable("admin_schedule_settings", {
  id: serial("id").primaryKey(),
  availableDays: text("available_days").notNull().default(""),
  startTime: text("start_time").notNull().default("19:00"),
  endTime: text("end_time").notNull().default("23:00"),
  maxConcurrentMatches: integer("max_concurrent_matches").notNull().default(2),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type AdminScheduleSettings = typeof adminScheduleSettingsTable.$inferSelect;
