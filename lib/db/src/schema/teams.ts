import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { playersTable } from "./players";

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  tag: text("tag").notNull().unique(), // 2-5 uppercase alphanumeric, e.g. "TSM"
  captainPlayerId: integer("captain_player_id")
    .references(() => playersTable.id, { onDelete: "set null" }),
    // nullable: allows orphaned teams when captain player is deleted
    // Admin can assign new captain via PUT /api/teams/:id
  discordServerId: text("discord_server_id"),
  teamElo: integer("team_elo").notNull().default(1000),
  peakElo: integer("peak_elo").notNull().default(1000),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  defaultMatchVisibility: text("default_match_visibility").default("private"), // public | private (v3.1: default PRIVATE — scrim data private by default per PRD §7)
  lastMatchAt: timestamp("last_match_at"), // updated on every match submission
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTeamSchema = createInsertSchema(teamsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teamsTable.$inferSelect;
