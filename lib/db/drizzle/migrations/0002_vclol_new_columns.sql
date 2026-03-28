-- Migration: #115 discordUrl on events + #116 gameNumber/vodType/teamId on vod_entries + bestOf on matches
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "discord_url" text;
ALTER TABLE "vod_entries" ADD COLUMN IF NOT EXISTS "game_number" integer;
ALTER TABLE "vod_entries" ADD COLUMN IF NOT EXISTS "vod_type" text;
ALTER TABLE "vod_entries" ADD COLUMN IF NOT EXISTS "team_id" integer REFERENCES "teams"("id") ON DELETE SET NULL;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "best_of" integer;
