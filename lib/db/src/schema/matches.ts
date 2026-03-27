import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";
import { teamsTable } from "./teams";
import { seasonsTable } from "./seasons";

export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),

  // Team references (5v5 model)
  teamAId: integer("team_a_id").references(() => teamsTable.id, { onDelete: "set null" }),
  teamBId: integer("team_b_id").references(() => teamsTable.id, { onDelete: "set null" }),
  sideAName: text("side_a_name").notNull(), // team name snapshot at time of match
  sideBName: text("side_b_name").notNull(),
  matchTitle: text("match_title").notNull(),
  winnerName: text("winner_name").notNull(),
  score: text("score"),
  format: text("format"), // BO1, BO3, BO5
  bestOf: integer("best_of"),                  // 1, 3, or 5; null treated as 1 (#116)

  // Team ELO tracking
  teamAEloBefore: integer("team_a_elo_before"),
  teamAEloAfter: integer("team_a_elo_after"),
  teamBEloBefore: integer("team_b_elo_before"),
  teamBEloAfter: integer("team_b_elo_after"),

  // Game metadata from .rofl
  gameId: text("game_id").unique(),
  gameDuration: integer("game_duration"), // milliseconds
  gameVersion: text("game_version"), // patch string
  matchType: text("match_type").notNull().default("scrim"), // scrim | ranked_tournament | event (v3.1: ELO only for ranked_tournament + event)
  resultSource: text("result_source").notNull().default("rofl_parse"), // rofl_parse | tournament_api | admin_manual
  tournamentCode: text("tournament_code"), // Riot Tournament API code, nullable
  roflFilePath: text("rofl_file_path"),

  // Visibility: NULL = private permanently (D-11). Captain sets via /visibility.
  // Far-future date (9999-01-01) = private. Past date or epoch = public.
  visibleAfter: timestamp("visible_after"),

  // Season + Event links
  seasonId: integer("season_id").references(() => seasonsTable.id, { onDelete: "set null" }),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "set null" }),

  // Bracket fields (kept from v1 for tournament support)
  isPlayoff: boolean("is_playoff").notNull().default(false),
  round: integer("round"),
  bracketSlot: integer("bracket_slot"),
  nextMatchId: integer("next_match_id"),
  isLosersBracket: boolean("is_losers_bracket").default(false),
  groupId: integer("group_id"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMatchSchema = createInsertSchema(matchesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matchesTable.$inferSelect;
