import { db } from "@workspace/db";
import {
  adminUsersTable,
  eventsTable,
  matchesTable,
  vodEntriesTable,
} from "@workspace/db";
import crypto from "crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function seed() {
  console.log("Seeding database...");

  const existing = await db.select().from(adminUsersTable);
  if (existing.length === 0) {
    await db.insert(adminUsersTable).values({
      email: "admin@vclol.gg",
      passwordHash: hashPassword("admin123"),
    });
    console.log("Created admin user: admin@vclol.gg / admin123");
  } else {
    console.log("Admin already exists, skipping admin seed");
  }

  const existingEvents = await db.select().from(eventsTable);
  if (existingEvents.length === 0) {
    const [event1] = await db.insert(eventsTable).values({
      title: "VCLOL 1v1 Open — March 2026",
      slug: "vclol-1v1-open-march-2026",
      format: "1v1",
      eventDate: "2026-03-29",
      registrationStatus: "open",
      shortDescription: "Our first lightweight 1v1 test event. Open to all Vancouver / Lower Mainland players.",
      fullDescription: "This is our inaugural test event — a lightweight 1v1 format to gather our first match records and test the format with local players. No prize pool this time. This is about getting reps in, building the archive, and seeing who shows up.\n\nAll skill levels welcome. This is not a ranked event — it is a competitive environment for local players to get real games in and be recorded.",
      rulesSummary: "Standard Summoner's Rift 1v1. Mid lane only. First to achieve one of: first blood, first tower, or 100 CS wins the game. Best of 3 format. Players must use a Vancouver / Lower Mainland connection. Riot ID required to register.",
    }).returning();

    const [event2] = await db.insert(eventsTable).values({
      title: "VCLOL In-House — April 2026 (TBD)",
      slug: "vclol-in-house-april-2026",
      format: "In-house",
      eventDate: "2026-04-19",
      registrationStatus: "upcoming",
      shortDescription: "A casual in-house 5v5 event for registered interest list members. Format and availability TBD.",
      fullDescription: "If we gather enough interest, this will be our first in-house 5v5 event. Exact format to be confirmed based on player count. Sign up to the interest list to be notified.",
      rulesSummary: "TBD pending player count and availability.",
    }).returning();

    const [match1] = await db.insert(matchesTable).values({
      eventId: event1!.id,
      matchTitle: "Quarterfinal 1",
      sideAName: "TwitchArcher#NA1",
      sideBName: "VoidWalker#EUW",
      winnerName: "TwitchArcher#NA1",
      score: "2-1",
      format: "1v1",
      vodUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    }).returning();

    const [match2] = await db.insert(matchesTable).values({
      eventId: event1!.id,
      matchTitle: "Quarterfinal 2",
      sideAName: "SteelMind#VAN",
      sideBName: "CloudRift#BC",
      winnerName: "SteelMind#VAN",
      score: "2-0",
      format: "1v1",
      vodUrl: null,
    }).returning();

    await db.insert(vodEntriesTable).values({
      eventId: event1!.id,
      title: "TwitchArcher vs VoidWalker — QF1 Full VOD",
      format: "1v1",
      playerNames: "TwitchArcher#NA1, VoidWalker#EUW",
      roleTag: "Mid",
      notes: "Close series. Game 3 was the highlight — great mechanics from both players.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });

    await db.insert(vodEntriesTable).values({
      eventId: event1!.id,
      title: "SteelMind vs CloudRift — QF2 Full VOD",
      format: "1v1",
      playerNames: "SteelMind#VAN, CloudRift#BC",
      roleTag: "Mid",
      notes: "Dominant performance by SteelMind in game 2.",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });

    console.log("Seeded events, matches, and VODs");
  } else {
    console.log("Events already exist, skipping event seed");
  }

  console.log("Done.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
