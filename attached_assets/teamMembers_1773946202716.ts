import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teamsTable } from "./teams";
import { playersTable } from "./players";

export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull()
    .references(() => playersTable.id, { onDelete: "cascade" }),
  role: text("role"), // top, jg, mid, adc, sup, fill, null
  status: text("status").notNull().default("active"), // active, inactive
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembersTable).omit({ id: true, joinedAt: true });
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembersTable.$inferSelect;
