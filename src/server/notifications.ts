import "server-only";
import { getSql } from "./db";
import { recordVisitsToComplete } from "./visitsToComplete";

// The admins' notifications of new bookings (the bell in the admin top bar). An event is
// recorded once, for every admin; each admin's read state is the newest one they've seen.

export type AdminNotificationKind = "booking_paid" | "proof_uploaded" | "visit_to_complete";

/** How many of the newest notifications the bell lists */
export const NOTIFICATIONS_SHOWN = 20;

export interface AdminNotification {
  id: number;
  kind: AdminNotificationKind;
  appointment_id: number | null;
  /** The booking's client (users.id), for the link to their page */
  client_user_id: number | null;
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

/** The newest notifications, each marked unread or not for this admin, and how many are unread */
export async function listAdminNotifications(adminUserId: number) {
  const sql = getSql();
  // Visits that just ended are recorded when the bell asks (no cron needed); a failure here only
  // delays them to the next ask
  await recordVisitsToComplete().catch((error) => console.error("[notifications] visits to complete:", error));
  const rows = await sql<AdminNotification[]>`
    select n.id, n.kind, n.appointment_id,
      -- the walk-in guest has no client page
      case when cu.clerk_id = 'walkin_guest' then null else a.user_id end as client_user_id,
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
    order by n.id desc
    limit ${NOTIFICATIONS_SHOWN}
  `;
  // Counted up to the newest one listed, so one recorded in between isn't counted without being
  // listed (opening the bell marks read up to the newest listed)
  const newest = rows[0]?.id ?? 0;
  const [{ unread }] = await sql<{ unread: number }[]>`
    select count(*)::int as unread from admin_notifications
    where id <= ${newest}
      and id > coalesce((select last_seen_id from admin_notification_seen where user_id = ${adminUserId}), 0)
  `;
  return { unread, notifications: [...rows] };
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
