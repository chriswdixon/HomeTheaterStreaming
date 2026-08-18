import { jsonError, jsonOk, requireHousehold } from "@/lib/server/api";
import {
  countUnreadNotifications,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/server/notifications";

export async function GET() {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const [notifications, unreadCount] = await Promise.all([
    loadNotifications(result.userId),
    countUnreadNotifications(result.userId),
  ]);

  return jsonOk({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const result = await requireHousehold();
  if ("error" in result) return result.error;

  const body = (await request.json()) as {
    id?: string;
    markAll?: boolean;
  };

  if (body.markAll) {
    await markAllNotificationsRead(result.userId);
    return jsonOk({ ok: true });
  }

  if (!body.id) {
    return jsonError("id or markAll is required", 400);
  }

  await markNotificationRead(result.userId, body.id);
  return jsonOk({ ok: true });
}
