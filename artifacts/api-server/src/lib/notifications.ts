import { db } from "@workspace/db";
import { notificationsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

type NotificationType =
  | "match_result"
  | "no_show_flagged"
  | "season_completed"
  | "badge_earned"
  | "event_registration_confirmed"
  | "event_registration_declined";

// ── Email delivery (Resend) ───────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[notify] RESEND_API_KEY not set — email skipped");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "VCLoL <noreply@vclol.gg>",
      to,
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }
}

// ── Discord DM delivery ───────────────────────────────────────────────────────

async function sendDiscordDm(
  discordId: string,
  content: string
): Promise<void> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn("[notify] DISCORD_BOT_TOKEN not set — Discord DM skipped");
    return;
  }

  // Step 1: create/fetch DM channel
  const dmRes = await fetch("https://discord.com/api/v10/users/@me/channels", {
    method: "POST",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipient_id: discordId }),
  });

  if (!dmRes.ok) {
    const body = await dmRes.text().catch(() => "");
    throw new Error(`Discord create DM error ${dmRes.status}: ${body}`);
  }

  const { id: channelId } = (await dmRes.json()) as { id: string };

  // Step 2: send message to DM channel
  const msgRes = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    }
  );

  if (!msgRes.ok) {
    const body = await msgRes.text().catch(() => "");
    throw new Error(`Discord send message error ${msgRes.status}: ${body}`);
  }
}

// ── Main notify function ──────────────────────────────────────────────────────

/**
 * Send a notification to a player.
 * Always stores a web notification in DB first.
 * Then routes to email and/or Discord DM based on player preference.
 * Delivery failures are logged but never throw — web notification is always saved.
 */
export async function notifyPlayer(
  playerId: number,
  type: NotificationType,
  title: string,
  message: string,
  entityId?: number
) {
  try {
    const [player] = await db
      .select({
        notificationPreference: playersTable.notificationPreference,
        email: playersTable.email,
        discordId: playersTable.discordId,
      })
      .from(playersTable)
      .where(eq(playersTable.id, playerId));

    if (!player) return;

    const pref = player.notificationPreference || "web";

    // Always store in DB for web notifications (non-blocking on delivery failures)
    await db.insert(notificationsTable).values({
      playerId,
      type,
      title,
      message,
      ...(entityId != null ? { entityId } : {}),
    });

    // Email delivery
    if (pref === "email" || pref === "both") {
      if (!player.email) {
        console.warn(`[notify] Player ${playerId} has email pref but no email address`);
      } else {
        sendEmail(player.email, title, message).catch((err) => {
          console.error(`[notify] Email failed for player ${playerId}:`, err);
        });
      }
    }

    // Discord DM delivery
    if (pref === "discord" || pref === "both") {
      if (!player.discordId) {
        console.warn(`[notify] Player ${playerId} has discord pref but no discordId`);
      } else {
        sendDiscordDm(player.discordId, `**${title}**\n${message}`).catch((err) => {
          console.error(`[notify] Discord DM failed for player ${playerId}:`, err);
        });
      }
    }
  } catch (err) {
    console.error(`[notify] Error notifying player ${playerId}:`, err);
  }
}
