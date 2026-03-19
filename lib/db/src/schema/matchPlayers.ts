import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { matchesTable } from "./matches";
import { playersTable } from "./players";

export const matchPlayersTable = pgTable("match_players", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull()
    .references(() => matchesTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id")
    .references(() => playersTable.id, { onDelete: "set null" }),
  teamSide: text("team_side").notNull(), // "A" or "B" (maps to TEAM 100/200 in .rofl)

  // Identity from .rofl
  puuid: text("puuid"),
  riotIdGameName: text("riot_id_game_name"),
  riotIdTagLine: text("riot_id_tag_line"),

  // Game performance
  champion: text("champion"), // from SKIN field in .rofl
  teamPosition: text("team_position"), // TEAM_POSITION or INDIVIDUAL_POSITION
  kills: integer("kills").notNull().default(0),
  deaths: integer("deaths").notNull().default(0),
  assists: integer("assists").notNull().default(0),
  cs: integer("cs").notNull().default(0), // MINIONS_KILLED
  neutralCs: integer("neutral_cs").notNull().default(0), // NEUTRAL_MINIONS_KILLED
  gold: integer("gold").notNull().default(0), // GOLD_EARNED
  damageToChampions: integer("damage_to_champions").notNull().default(0),
  visionScore: integer("vision_score").notNull().default(0),
  level: integer("level"),
  win: boolean("win").notNull().default(false),

  // Items (slot 0-6)
  item0: integer("item0"),
  item1: integer("item1"),
  item2: integer("item2"),
  item3: integer("item3"),
  item4: integer("item4"),
  item5: integer("item5"),
  item6: integer("item6"),

  // Summoner spells
  summonerSpell1: integer("summoner_spell_1"),
  summonerSpell2: integer("summoner_spell_2"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMatchPlayerSchema = createInsertSchema(matchPlayersTable).omit({ id: true, createdAt: true });
export type InsertMatchPlayer = z.infer<typeof insertMatchPlayerSchema>;
export type MatchPlayer = typeof matchPlayersTable.$inferSelect;
