import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const seasonsTable = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("upcoming"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  // ELO soft reset factor: new_elo = 1000 + (old_elo - 1000) * factor
  eloResetFactor: numeric("elo_reset_factor", { precision: 3, scale: 2 }).notNull().default("0.50"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSeasonSchema = createInsertSchema(seasonsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasonsTable.$inferSelect;
