import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { teamsTable } from "./teams";
import { adminUsersTable } from "./adminUsers";

export const playerBansTable = pgTable("player_bans", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => playersTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  bannedBy: integer("banned_by").notNull().references(() => adminUsersTable.id),
  banType: text("ban_type").notNull().default("permanent"), // temporary | permanent
  expiresAt: timestamp("expires_at"), // null = permanent
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type PlayerBan = typeof playerBansTable.$inferSelect;
