import { db } from "@workspace/db";
import { notificationsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type NotificationType =
  | "challenge_received"
  | "challenge_accepted"
  | "challenge_declined"
  | "challenge_auto_accepted"
  | "match_result"
  | "no_show_flagged"
  | "season_completed"
  | "badge_earned";

/**
 * Send a notification to a player.
 * Reads player.notificationPreference and routes accordingly.
 * Phase 1: web notifications only (stored in DB, frontend polls).
 * Phase 2: add email (nodemailer/Resend) and Discord DM (bot token).
 */
export async function notifyPlayer(
  playerId: number,
  type: NotificationType,
  title: string,
  message: string
) {
  try {
    const [player] = await db
      .select({ notificationPreference: playersTable.notificationPreference })
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) return;

    const pref = player.notificationPreference || "web";

    // Always store in DB for web notifications
    await db.insert(notificationsTable).values({
      playerId,
      type,
      title,
      message,
    });

    // Future: email and discord DM based on preference
    if (pref === "email" || pref === "both") {
      // TODO: implement email via nodemailer/Resend
      console.log(`[notify] Email to player ${playerId}: ${title}`);
    }

    if (pref === "discord" || pref === "both") {
      // TODO: implement Discord DM via bot token
      console.log(`[notify] Discord DM to player ${playerId}: ${title}`);
    }
  } catch (err) {
    console.error(`[notify] Error notifying player ${playerId}:`, err);
  }
}
