import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { matchesTable } from "./matches";
import { playersTable } from "./players";

export const replaySubmissionsTable = pgTable("replay_submissions", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matchesTable.id, { onDelete: "set null" }),
  playerId: integer("player_id").references(() => playersTable.id, { onDelete: "set null" }),
  roflFilePath: text("rofl_file_path"),
  fileSizeBytes: integer("file_size_bytes"),
  status: text("status").notNull().default("pending"),
  renderMode: text("render_mode").notNull(),
  youtubeUrlA: text("youtube_url_a"),
  youtubeUrlB: text("youtube_url_b"),
  errorMessage: text("error_message"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});
export type ReplaySubmission = typeof replaySubmissionsTable.$inferSelect;
