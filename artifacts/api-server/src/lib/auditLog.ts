import { db } from "@workspace/db";
import { adminActionsTable } from "@workspace/db";

export async function logAdminAction(
  adminId: number,
  actionType: string,
  entityType: string,
  entityId: number | null,
  detail: string
): Promise<void> {
  try {
    await db.insert(adminActionsTable).values({
      adminId,
      actionType,
      entityType,
      entityId,
      detail,
    });
  } catch (err) {
    console.error("[audit] Failed to log admin action:", err);
  }
}
