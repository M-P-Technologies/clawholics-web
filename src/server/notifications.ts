import "server-only";
import { getSql } from "./db";
import { recordVisitsToComplete } from "./visitsToComplete";

// The admins' notifications of new bookings (the bell in the admin top bar). An event is
// recorded once, for every admin; each admin's read state is the newest one they've seen.

type AdminNotificationKind = "booking_paid" | "proof_uploaded" | "visit_to_complete" | "payment_to_check";

/** How many notifications the bell lists at a time: the newest, then more as the admin scrolls */
export const NOTIFICATIONS_PAGE_SIZE = 5;
/** The most one page may ask for */
export const NOTIFICATIONS_MAX_PAGE = 20;

export interface AdminNotification {
  id: number;
  kind: AdminNotificationKind;
  appointment_id: number | null;
  /** The booking's client (users.id), for the link to their page */
  client_user_id: number | null;
  /** The client's Clerk id, for their photo (null for the walk-in guest) */
  client_clerk_id: string | null;
  client_name: string;
  service_name: string;
  nailist_name: string;
  appointment_date: string;
  appointment_time: string;
  created_at: string;
  unread: boolean;
}

/**
 * Records an event for the admins, once: a repeated webhook or a retried upload is ignored. Call
 * it after the event's own transaction, never inside it, so a failure here can't undo a payment.
 */
export async function notifyAdmins(kind: AdminNotificationKind, refId: number, appointmentId: number) {
  await getSql()`
    insert into admin_notifications (kind, ref_id, appointment_id)
    values (${kind}, ${refId}, ${appointmentId})
    on conflict (kind, ref_id) do nothing
  `;
}

/**
 * A page of notifications, newest first, each marked unread or not for this admin, how many are
 * unread, and whether there are older ones. Without `before` it's the newest page; with it, the
 * ones older than that id (the next page as the admin scrolls).
 */
export async function listAdminNotifications(adminUserId: number, { before = null as number | null, limit = NOTIFICATIONS_PAGE_SIZE } = {}) {
  const sql = getSql();
  // Visits that just ended are recorded when the bell asks for its newest page (no cron needed);
  // a failure here only delays them to the next ask
  if (before === null) {
    await recordVisitsToComplete().catch((error) => console.error("[notifications] visits to complete:", error));
  }
  // One more than the page, to know whether there are older ones
  const found = await sql<AdminNotification[]>`
    select n.id, n.kind, n.appointment_id,
      -- the walk-in guest has no client page
      case when cu.clerk_id = 'walkin_guest' then null else a.user_id end as client_user_id,
      -- for the client's photo (from Clerk); none for the walk-in guest
      case when cu.clerk_id = 'walkin_guest' then null else cu.clerk_id end as client_clerk_id,
      trim(coalesce(a.walkin_first_name, cp.first_name, '') || ' ' || coalesce(a.walkin_last_name, cp.last_name, '')) as client_name,
      coalesce(a.service_name, '') as service_name,
      coalesce(nl.name, a.nailist_name, '') as nailist_name,
      coalesce(a.appointment_date, '') as appointment_date,
      coalesce(a.appointment_time, '') as appointment_time,
      n.created_at,
      n.id > coalesce(seen.last_seen_id, 0) as unread
    from admin_notifications n
    left join appointments a on a.id = n.appointment_id
    left join customer_profiles cp on cp.user_id = a.user_id
    left join users cu on cu.id = a.user_id
    left join nailists nl on nl.id = a.nailist_id
    left join admin_notification_seen seen on seen.user_id = ${adminUserId}
    ${before === null ? sql`` : sql`where n.id < ${before}`}
    order by n.id desc
    limit ${limit + 1}
  `;
  const rows = found.slice(0, limit);
  const hasMore = found.length > limit;
  // The bell reads the unread count from its newest page only, so an older one doesn't count
  if (before !== null) return { unread: 0, notifications: [...rows], hasMore };
  // Counted up to the newest one listed, so one recorded in between isn't counted without being
  // listed (opening the bell marks read up to the newest listed)
  const newest = rows[0]?.id ?? 0;
  const [{ unread }] = await sql<{ unread: number }[]>`
    select count(*)::int as unread from admin_notifications
    where id <= ${newest}
      and id > coalesce((select last_seen_id from admin_notification_seen where user_id = ${adminUserId}), 0)
  `;
  return { unread, notifications: [...rows], hasMore };
}

/** Marks every notification up to `upToId` as seen by this admin (never moves back) */
export async function markAdminNotificationsSeen(adminUserId: number, upToId: number) {
  await getSql()`
    insert into admin_notification_seen (user_id, last_seen_id) values (${adminUserId}, ${upToId})
    on conflict (user_id) do update set
      last_seen_id = greatest(admin_notification_seen.last_seen_id, excluded.last_seen_id),
      updated_at = clawholics_utc_now()
  `;
}
