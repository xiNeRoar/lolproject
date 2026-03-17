import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const interestSubmissionsTable = pgTable("interest_submissions", {
  id: serial("id").primaryKey(),
  riotId: text("riot_id").notNull(),
  discordUsername: text("discord_username").notNull(),
  currentRank: text("current_rank").notNull(),
  city: text("city").notNull(),
  preferredFormat: text("preferred_format").notNull(),
  availability: text("availability").notNull(),
  hasTeam: boolean("has_team").notNull(),
  willingWithoutPrize: boolean("willing_without_prize").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInterestSchema = createInsertSchema(interestSubmissionsTable).omit({ id: true, createdAt: true });
export type InsertInterest = z.infer<typeof insertInterestSchema>;
export type InterestSubmission = typeof interestSubmissionsTable.$inferSelect;
