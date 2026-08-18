import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import { getDb } from "@/db";
import { householdMembers, userNotifications } from "@/db/schema";
import { householdMemberJoinedMessage } from "@/lib/notifications";
import type { NotificationType } from "@/lib/notifications";
import { householdMemberDisplayName } from "@/lib/server/household-members";

export type UserNotificationView = {
  id: string;
  type: NotificationType;
  message: string;
  actorUserId: string | null;
  readAt: string | null;
  createdAt: string;
};

function mapNotification(row: typeof userNotifications.$inferSelect): UserNotificationView {
  return {
    id: row.id,
    type: row.type as NotificationType,
    message: row.message,
    actorUserId: row.actorUserId,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function loadNotifications(
  userId: string,
  limit = 20,
): Promise<UserNotificationView[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userNotifications)
    .where(eq(userNotifications.userId, userId))
    .orderBy(desc(userNotifications.createdAt))
    .limit(limit);

  return rows.map(mapNotification);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(userNotifications)
    .where(
      and(
        eq(userNotifications.userId, userId),
        isNull(userNotifications.readAt),
      ),
    );

  return row?.count ?? 0;
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const db = getDb();
  await db
    .update(userNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(userNotifications.id, notificationId),
        eq(userNotifications.userId, userId),
        isNull(userNotifications.readAt),
      ),
    );
}

export async function markAllNotificationsRead(userId: string) {
  const db = getDb();
  await db
    .update(userNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(userNotifications.userId, userId),
        isNull(userNotifications.readAt),
      ),
    );
}

export async function notifyHouseholdMemberJoined(
  householdId: string,
  joiningUserId: string,
) {
  const db = getDb();
  const members = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .where(eq(householdMembers.householdId, householdId));

  const recipients = members
    .map((member) => member.userId)
    .filter((userId) => userId !== joiningUserId);

  if (recipients.length === 0) return;

  const client = await clerkClient();
  let actorName = "Someone";
  try {
    const user = await client.users.getUser(joiningUserId);
    actorName = householdMemberDisplayName(user);
  } catch {
    // Keep fallback name when Clerk lookup fails.
  }

  const message = householdMemberJoinedMessage(actorName);
  await db.insert(userNotifications).values(
    recipients.map((userId) => ({
      userId,
      householdId,
      type: "household_member_joined",
      message,
      actorUserId: joiningUserId,
    })),
  );
}
