import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { adminUsersTable } from "./adminUsers";

export const adminActionsTable = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => adminUsersTable.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(), // create | update | delete | activate | complete | ban | unban
  entityType: text("entity_type").notNull(), // team | player | match | season | event | registration | vod | ladderSettings
  entityId: integer("entity_id"),
  detail: text("detail"), // human-readable summary
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type AdminAction = typeof adminActionsTable.$inferSelect;
