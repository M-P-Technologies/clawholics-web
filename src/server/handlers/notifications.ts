import "server-only";
import { requireAdmin, requireUserRow } from "../auth";
import { readJson, toId } from "../http";
import { listAdminNotifications, markAdminNotificationsSeen } from "../notifications";
import { ported } from "../worker";

// The signed-in admin's users.id, which their read state is kept under. requireAdmin provisions
// a Clerk-only admin's users row, like the other admin routes.
async function requireAdminRow(): Promise<number | Response> {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof Response) return adminCheck;
  const admin = await requireUserRow();
  if (admin instanceof Response || admin.id === null) {
    return Response.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }
  return admin.id;
}

// GET /notifications (admin): the newest notifications of new bookings, each marked unread or
// not for the signed-in admin, and how many are unread: { unread, notifications }.
export const getAdminNotifications = ported(async () => {
  const adminId = await requireAdminRow();
  if (adminId instanceof Response) return adminId;
  return Response.json(await listAdminNotifications(adminId));
});

// POST /notifications/read (admin) { upTo }: the signed-in admin has seen every notification up
// to that id.
export const markNotificationsRead = ported(async (req) => {
  const adminId = await requireAdminRow();
  if (adminId instanceof Response) return adminId;
  const { upTo } = await readJson<{ upTo?: unknown }>(req);
  const upToId = toId(upTo);
  if (upToId === null) return Response.json({ error: "upTo must be a notification id" }, { status: 400 });
  await markAdminNotificationsSeen(adminId, upToId);
  return Response.json({ success: true });
});
