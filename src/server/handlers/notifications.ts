import "server-only";
import { requireAdmin, requireUserRow } from "../auth";
import { readJson, toId } from "../http";
import { NOTIFICATIONS_MAX_PAGE, NOTIFICATIONS_PAGE_SIZE, listAdminNotifications, markAdminNotificationsSeen } from "../notifications";
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

// GET /notifications?before=&limit= (admin): a page of the notifications of new bookings, newest
// first, each marked unread or not for the signed-in admin, how many are unread, and whether
// there are older ones: { unread, notifications, hasMore }. Without `before` it's the newest page;
// with it, the ones older than that id (`unread` is then 0: it's read from the newest page).
// `limit` is 1-20, default 5.
export const getAdminNotifications = ported(async (req) => {
  const adminId = await requireAdminRow();
  if (adminId instanceof Response) return adminId;
  const params = new URL(req.url).searchParams;
  const before = params.has("before") ? toId(params.get("before")) : null;
  if (params.has("before") && before === null) return Response.json({ error: "before must be a notification id" }, { status: 400 });
  const asked = Number(params.get("limit") ?? NOTIFICATIONS_PAGE_SIZE);
  const limit = Number.isInteger(asked) ? Math.min(Math.max(asked, 1), NOTIFICATIONS_MAX_PAGE) : NOTIFICATIONS_PAGE_SIZE;
  return Response.json(await listAdminNotifications(adminId, { before, limit }));
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
