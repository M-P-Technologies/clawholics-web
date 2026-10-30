import "server-only";
import {
  APPOINTMENT_SORTS,
  ARTIST_SERVICE_MISMATCH,
  SERVICE_PRICE_SQL,
  listAppointmentPage,
  type AppointmentSort,
  cancelExpiredPendingAppointments,
  getAppointment,
  holdsSlot,
  isEligibleForChanges,
  isServiceBookable,
  isSlotConflict,
  listAppointments,
  listAppointmentsBetween,
  nailistOffersService,
} from "../appointments";
import { canAccess, requireAdmin, requireUserRow } from "../auth";
import { getSql } from "../db";
import { sendCancellationEmails, sendConfirmationEmail, sendRescheduleEmails } from "../email";
import { inBackground, readJson, routeNotFound, toId } from "../http";
import { notifyAdmins } from "../notifications";
import { createXenditRefund, expireXenditInvoice, getXenditInvoices } from "../payments";
import { getBookingHoldMinutes } from "../bookingHold";
import { checkSlot, hasStarted, normalizeSlot } from "../slotRules";
import { ported } from "../worker";
import { releaseVoucherOf } from "../birthdayVouchers";

// Booking and appointment routes, ported from worker-api/src/index.ts (~lines 1705-2022).
// Bodies, status codes and messages match the Worker. What's new is who may call them: the
// Worker trusted anyone, here the Clerk-verified session decides (owner of the appointment,
// or an admin).

type IdContext = { params: Promise<{ id: string }> };

const SLOT_TAKEN = { error: true, message: "Time slot already booked" };

// GET /booking/nailists[?service_id=] (public): artists, or the ones offering a service with
// the price each charges for it.
export const getBookingNailists = ported(async (req) => {
  const sql = getSql();
  const serviceParam = new URL(req.url).searchParams.get("service_id");
  if (serviceParam) {
    // Hidden/archived services have no bookable artists
    const serviceId = toId(serviceParam);
    if (serviceId === null || !(await isServiceBookable(serviceId))) return Response.json([]);
    // The artists in the admin's order (the distinct rows carry it only to be sorted by)
    return Response.json(await sql`
      select id, name, category_id, position, specialty, bio, image, service_price from (
        select distinct n.id, n.name, n.category_id, nc.name as position, n.specialty, n.bio, n.image,
          ${sql.unsafe(SERVICE_PRICE_SQL)} as service_price, n.display_order
        from nailists n
        inner join nailist_services ns on n.id = ns.nailist_id
        inner join services s on s.id = ns.service_id
        left join nailist_categories nc on n.category_id = nc.id
        where ns.service_id = ${serviceId}
      ) t
      order by display_order, id
    `);
  }
  return Response.json(await sql`
    select n.id, n.name, n.category_id, nc.name as position, n.specialty, n.bio, n.image
    from nailists n left join nailist_categories nc on n.category_id = nc.id
    order by n.display_order, n.id
  `);
});

// GET /booking/slots-detailed and /appointments/booked-slots (public): taken times only, by
// holdsSlot. Unpaid holds past their time (Admin > Settings) are released first, as booking does before its
// check, so the calendar offers what booking allows.
export const getBookedSlots = ported(async (req) => {
  const params = new URL(req.url).searchParams;
  const nailistId = toId(params.get("nailist_id"));
  const date = params.get("date");
  if (nailistId === null || !date) return Response.json([]);
  await cancelExpiredPendingAppointments();
  const sql = getSql();
  return Response.json(await sql`
    select appointment_time from appointments
    where nailist_id = ${nailistId} and appointment_date = ${date} and ${sql.unsafe(holdsSlot())}
  `);
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;
/** The longest range /booking/slots-range answers, in days: the booking calendar asks for a month */
const MAX_SLOTS_RANGE_DAYS = 62;

// GET /booking/slots-range?nailist_id=&from=YYYY-MM-DD&to=YYYY-MM-DD (public): the taken times
// of every day in the range in one query, for the booking calendar's fully booked days (it used
// to ask /booking/slots-detailed once per day). Dates are text, so the range compares as text.
export const getBookedSlotsRange = ported(async (req) => {
  const params = new URL(req.url).searchParams;
  const nailistId = toId(params.get("nailist_id"));
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  if (nailistId === null || !DATE.test(from) || !DATE.test(to) || from > to) {
    return Response.json({ error: "nailist_id, from and to (YYYY-MM-DD, from <= to) are required" }, { status: 400 });
  }
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (!(days <= MAX_SLOTS_RANGE_DAYS)) {
    return Response.json({ error: `The range can be at most ${MAX_SLOTS_RANGE_DAYS} days` }, { status: 400 });
  }
  await cancelExpiredPendingAppointments();
  const sql = getSql();
  return Response.json(await sql`
    select appointment_date, appointment_time from appointments
    where nailist_id = ${nailistId} and appointment_date between ${from} and ${to} and ${sql.unsafe(holdsSlot())}
    order by appointment_date, appointment_time
  `);
});

// POST /booking/create (signed in): the client's own booking, held until paid for the minutes set
// in Admin > Settings (booking_hold_minutes, default 5).
// The user comes from the session; the body's user_id is ignored.
export const createBooking = ported(async (req) => {
  const requester = await requireUserRow();
  if (requester instanceof Response) return requester;

  await cancelExpiredPendingAppointments();
  const b = await readJson<Record<string, unknown>>(req);
  if (requester.id === null) return Response.json({ error: true, message: "User ID is required" }, { status: 400 });
  if (!b.service_id) return Response.json({ error: true, message: "Service ID is required" }, { status: 400 });
  if (!b.nailist_id) return Response.json({ error: true, message: "Nailist ID is required" }, { status: 400 });
  if (!b.appointment_date || !b.appointment_time) {
    return Response.json({ error: true, message: "Appointment date and time are required" }, { status: 400 });
  }
  if (!(await isServiceBookable(b.service_id))) {
    return Response.json({ error: true, message: "This service is no longer available." }, { status: 400 });
  }
  if (!(await nailistOffersService(b.nailist_id, b.service_id))) {
    return Response.json({ error: true, message: ARTIST_SERVICE_MISMATCH }, { status: 400 });
  }

  const sql = getSql();
  const serviceId = toId(b.service_id)!;
  const nailistId = toId(b.nailist_id)!;
  const userId = requester.id;
  const slot = await checkSlot({ nailistId, date: String(b.appointment_date), time: String(b.appointment_time) });
  if (!slot.ok) {
    return slot.code === "SLOT_TAKEN"
      ? Response.json(SLOT_TAKEN, { status: 409 })
      : Response.json({ error: true, code: slot.code, message: slot.message }, { status: slot.status });
  }
  const names = await bookingNames(serviceId, nailistId);
  const expiresAt = await holdUntil();

  try {
    // One unpaid booking per client: the lock makes the check and the insert one step, so two
    // requests at once can't both pass the check
    const created = await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(${PENDING_LOCK}::int, ${userId}::int)`;
      const [pending] = await tx`select id from appointments where user_id = ${userId} and upper(status) = 'PENDING'`;
      if (pending) return null;
      const [row] = await tx<{ id: number }[]>`
        insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status, expires_at)
        values (${userId}, ${serviceId}, ${names.service}, ${nailistId}, ${names.nailist},
          ${String(b.appointment_date)}, ${slot.time}, 'PENDING', ${expiresAt})
        returning id
      `;
      return row;
    });
    if (!created) {
      return Response.json(
        { error: true, code: "PENDING_APPOINTMENT_EXISTS", message: "You already have an unpaid pending appointment." },
        { status: 409 },
      );
    }
    return Response.json({ appointment_id: created.id, expires_at: expiresAt, status: "PENDING" });
  } catch (error) {
    // Two clients racing for the same slot: the unique index lets only one in
    if (isSlotConflict(error)) return Response.json(SLOT_TAKEN, { status: 409 });
    throw error;
  }
});

/** When a booking made now stops holding its slot unless paid (the hold set in Admin > Settings) */
async function holdUntil() {
  return new Date(Date.now() + (await getBookingHoldMinutes()) * 60_000).toISOString();
}

/** First key of the advisory lock that serializes a client's new bookings (the second is their users.id) */
const PENDING_LOCK = 7_301;

/** The service's and artist's names as the catalog has them, not as the request says */
async function bookingNames(serviceId: number, nailistId: number) {
  const [row] = await getSql()<{ service: string | null; nailist: string | null }[]>`
    select (select name from services where id = ${serviceId}) as service,
      (select name from nailists where id = ${nailistId}) as nailist
  `;
  return { service: row?.service ?? "", nailist: row?.nailist ?? "" };
}

// POST /booking/admin/create (admin): a confirmed walk-in or phone booking.
export const createAdminBooking = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  await cancelExpiredPendingAppointments();
  const b = await readJson<Record<string, string | number | undefined>>(req);
  const { first_name, last_name, phone, email, service_id, nailist_id, appointment_date, appointment_time } = b;

  if (!first_name || !last_name || !phone || !service_id || !nailist_id || !appointment_date || !appointment_time) {
    return Response.json({ error: true, message: "Please complete all required appointment fields." }, { status: 400 });
  }
  if (!(await isServiceBookable(service_id))) {
    return Response.json({ error: true, message: "This service is no longer available." }, { status: 400 });
  }
  if (!(await nailistOffersService(nailist_id, service_id))) {
    return Response.json({ error: true, message: ARTIST_SERVICE_MISMATCH }, { status: 400 });
  }

  const slotTaken = {
    error: true,
    code: "SLOT_TAKEN",
    message: "This appointment slot is already taken by another active appointment.",
  };
  const sql = getSql();
  const nailistId = toId(nailist_id)!;
  // A walk-in may be recorded once it has started
  const slot = await checkSlot({ nailistId, date: String(appointment_date), time: String(appointment_time), allowPast: true });
  if (!slot.ok) {
    return slot.code === "SLOT_TAKEN"
      ? Response.json(slotTaken, { status: 409 })
      : Response.json({ error: true, code: slot.code, message: slot.message }, { status: slot.status });
  }
  const names = await bookingNames(toId(service_id)!, nailistId);
  const expiresAt = await holdUntil();

  // A known client email books under that account; otherwise under the shared walk-in user,
  // with the client's details stored on the appointment.
  const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  let userId: number | null = null;
  if (trimmedEmail) {
    const [existing] = await sql<{ id: number }[]>`select id from users where lower(email) = ${trimmedEmail}`;
    userId = existing?.id ?? null;
  }
  const walkin = userId === null
    ? { first: String(first_name).trim(), last: String(last_name).trim(), phone: String(phone).trim(), email: trimmedEmail || null }
    : { first: null, last: null, phone: null, email: null };
  if (userId === null) {
    const [guest] = await sql<{ id: number }[]>`
      insert into users (clerk_id, email, role) values ('walkin_guest', 'walkin-guest@clawholics.local', 'customer')
      on conflict (clerk_id) do update set clerk_id = excluded.clerk_id
      returning id
    `;
    userId = guest.id;
  }

  let createdId: number;
  try {
    const [created] = await sql<{ id: number }[]>`
      insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status, expires_at,
        walkin_first_name, walkin_last_name, walkin_phone, walkin_email)
      values (${userId}, ${toId(service_id)!}, ${names.service}, ${nailistId}, ${names.nailist},
        ${String(appointment_date)}, ${slot.time}, 'CONFIRMED', ${expiresAt},
        ${walkin.first}, ${walkin.last}, ${walkin.phone}, ${walkin.email})
      returning id
    `;
    createdId = created.id;
  } catch (error) {
    if (isSlotConflict(error)) return Response.json(slotTaken, { status: 409 });
    throw error;
  }

  const appt = await getAppointment(createdId);
  if (appt) {
    inBackground("walk-in confirmation email", () => sendConfirmationEmail(appt, { walkIn: true }));
  }
  return Response.json(appt, { status: 201 });
});

/** The most rows one page of the admin list returns */
const MAX_APPOINTMENT_PAGE_SIZE = 50;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// GET /booking/appointments and /appointments[?status=A,B] (admin): every appointment.
// With ?page=N it answers one page instead, as { rows, total, page, pageSize }, filtered by
// status (A,B), proof=review, paid=1 (only bookings ever paid), on or from (YYYY-MM-DD), artist and q, and sorted by
// sort=upcoming|latest|booked_newest|booked_oldest; pageSize is 1-50 (default 10).
export const listAllAppointments = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  await cancelExpiredPendingAppointments();
  const params = new URL(req.url).searchParams;
  const status = params.get("status");
  const listed = (status ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const statuses = listed.length > 0 ? listed : null;
  if (!params.has("page")) return Response.json(await listAppointments(statuses));

  const page = Number(params.get("page"));
  const pageSize = params.has("pageSize") ? Number(params.get("pageSize")) : 10;
  const sort = params.get("sort") ?? "upcoming";
  const on = params.get("on");
  const from = params.get("from");
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_APPOINTMENT_PAGE_SIZE) {
    return Response.json({ error: `page must be 1 or more, and pageSize 1 to ${MAX_APPOINTMENT_PAGE_SIZE}` }, { status: 400 });
  }
  if (!Object.hasOwn(APPOINTMENT_SORTS, sort)) {
    return Response.json({ error: `sort must be one of ${Object.keys(APPOINTMENT_SORTS).join(", ")}` }, { status: 400 });
  }
  if ((on && !DAY.test(on)) || (from && !DAY.test(from))) {
    return Response.json({ error: "on and from must be dates (YYYY-MM-DD)" }, { status: 400 });
  }

  const result = await listAppointmentPage({
    statuses: statuses ?? [],
    proofToReview: params.get("proof") === "review",
    toComplete: params.get("complete") === "due",
    photosToAdd: params.get("complete") === "photos",
    paidOnly: params.get("paid") === "1",
    on,
    from,
    artist: params.get("artist")?.trim() || null,
    search: params.get("q")?.trim() || null,
    sort: sort as AppointmentSort,
    page,
    pageSize,
  });
  return Response.json({ ...result, page, pageSize });
});

// GET /booking/appointments/:id and /appointments/:id (owner or admin)
export const getAppointmentById = ported<IdContext>(async (_req, { params }) => {
  const requester = await requireUserRow();
  if (requester instanceof Response) return requester;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  await cancelExpiredPendingAppointments();
  const appt = await getAppointment(id);
  if (!appt) return routeNotFound();
  if (!canAccess(requester, appt.user_id)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json(appt);
});

/** Every status an appointment can have (the admin's status menu offers these) */
const APPOINTMENT_STATUSES = ["PENDING", "AWAITING_PROOF", "CONFIRMED", "COMPLETED", "CANCELLED", "REFUNDED", "NO_SHOW"];
/** Still to happen: a booking that can be moved or cancelled */
const OPEN_STATUSES = ["PENDING", "AWAITING_PROOF", "CONFIRMED"];
const statusOf = (status: string | null | undefined) => String(status ?? "").trim().toUpperCase();
/** The appointment's start has passed (Manila time); an unreadable time counts from the day's start */
const appointmentStarted = (date: string, time: string) => hasStarted(date, normalizeSlot(time) ?? "00:00-00:00");

// PATCH /booking/appointments/:id/status and /appointments/:id/status (admin)
export const updateAppointmentStatus = ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  const { status } = await readJson<{ status?: unknown }>(req);
  const upperStatus = String(status || "").trim().toUpperCase();
  if (!APPOINTMENT_STATUSES.includes(upperStatus)) {
    return Response.json({ error: true, code: "INVALID_STATUS", message: `status must be one of ${APPOINTMENT_STATUSES.join(", ")}` }, { status: 400 });
  }
  const sql = getSql();
  const [current] = await sql<{ status: string | null }[]>`select status from appointments where id = ${id}`;
  if (!current) return Response.json({ message: "Appointment not found" }, { status: 404 });
  const was = String(current.status ?? "").trim().toUpperCase();

  // A visit is completed through its completion record (what was paid, who did it), not here
  if (upperStatus === "COMPLETED" && was !== "COMPLETED") {
    return Response.json(
      { error: true, code: "USE_COMPLETION", message: "Complete a visit from its Complete visit form." },
      { status: 409 },
    );
  }
  // A no-show is a confirmed visit the client didn't come to (the downpayment is kept)
  if (upperStatus === "NO_SHOW" && was !== "CONFIRMED" && was !== "NO_SHOW") {
    return Response.json(
      { error: true, code: "NOT_CONFIRMED", message: "Only a confirmed visit can be marked as a no-show." },
      { status: 409 },
    );
  }
  try {
    await sql.begin(async (tx) => {
      await tx`
        update appointments a set status = ${upperStatus},
          expires_at = case when ${upperStatus} in ('CANCELLED', 'REFUNDED') then null else a.expires_at end,
          -- When it was cancelled (or marked a no-show) or refunded, for the Sales page's money: the
          -- latest time it went into that state, so a booking reactivated and cancelled again later
          -- is dated by the later one (moving between cancelled and no-show keeps the date)
          cancelled_at = case when ${upperStatus} in ('CANCELLED', 'CANCELED', 'NO_SHOW')
            and upper(trim(coalesce(old.was, ''))) not in ('CANCELLED', 'CANCELED', 'NO_SHOW') then clawholics_utc_now() else a.cancelled_at end,
          refunded_at = case when ${upperStatus} = 'REFUNDED'
            and upper(trim(coalesce(old.was, ''))) <> 'REFUNDED' then clawholics_utc_now() else a.refunded_at end
        from (select id, status as was from appointments where id = ${id}) old
        where a.id = old.id
      `;
      // Leaving COMPLETED: the visit's record (what was paid, who did it) no longer stands
      if (was === "COMPLETED" && upperStatus !== "COMPLETED") {
        await tx`delete from visit_completions where appointment_id = ${id}`;
        await releaseVoucherOf(tx, id);
      }
    });
  } catch (error) {
    // e.g. re-activating a cancelled booking whose slot was taken since
    if (isSlotConflict(error)) {
      return Response.json(
        { error: true, code: "SLOT_TAKEN", message: "This appointment slot is already taken by another active appointment." },
        { status: 409 },
      );
    }
    throw error;
  }
  return Response.json(await getAppointment(id));
});

// GET /booking/schedule?month=YYYY-MM (admin): the admin calendar.
export const getSchedule = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const month = new URL(req.url).searchParams.get("month");
  if (!month) return Response.json({ message: "Month required" }, { status: 400 });
  const [year, monthNumber] = month.split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(monthNumber)) return Response.json({ message: "Month required" }, { status: 400 });
  await cancelExpiredPendingAppointments();

  const monthStart = `${month}-01`;
  // Last day of the month, computed in UTC like the Worker (independent of the server's timezone)
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  const sql = getSql();
  const [nailists, appointments, dayOffs, slots] = await Promise.all([
    sql`select * from nailists order by id asc`,
    listAppointmentsBetween(monthStart, monthEnd),
    sql`select * from nailist_day_offs where day_off_type = 'REGULAR' or (day_off_type = 'CUSTOM' and date between ${monthStart} and ${monthEnd})`,
    sql<{ nailist_id: number; start_time: string; end_time: string }[]>`
      select nailist_id, start_time, end_time from nailist_time_slots order by start_time asc
    `,
  ]);
  const pad = (t: string) => {
    const [h, m] = (t || "").trim().split(":");
    return h && m ? `${h.padStart(2, "0")}:${m.padStart(2, "0")}` : t;
  };
  const timeSlots = slots.map((s) => ({ ...s, start_time: pad(s.start_time).slice(0, 5), end_time: pad(s.end_time).slice(0, 5) }));
  return Response.json({ nailists, appointments, dayOffs, timeSlots });
});

// POST /booking/:id/reschedule (owner or admin). A client moves a confirmed booking at least 72
// hours ahead, as their appointment card offers; an admin moves any booking still to happen.
// Either way the new time must be one the booking calendar offers.
export const rescheduleAppointment = ported<IdContext>(async (req, { params }) => {
  const requester = await requireUserRow();
  if (requester instanceof Response) return requester;
  const id = toId((await params).id);
  if (id === null) return Response.json({ message: "Appointment not found" }, { status: 404 });
  const oldAppt = await getAppointment(id);
  if (!oldAppt) return Response.json({ message: "Appointment not found" }, { status: 404 });
  if (!canAccess(requester, oldAppt.user_id)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { newDate, newTime } = await readJson<{ newDate?: string; newTime?: string }>(req);
  if (!newDate || !newTime) return Response.json({ message: "newDate and newTime are required" }, { status: 400 });

  const isAdmin = requester.role === "admin";
  const status = statusOf(oldAppt.status);
  const movable = isAdmin
    ? OPEN_STATUSES.includes(status)
    : status === "CONFIRMED" && isEligibleForChanges(oldAppt.appointment_date, oldAppt.appointment_time);
  if (!movable) {
    return Response.json(
      {
        code: "NOT_RESCHEDULABLE",
        message: isAdmin
          ? "Only a booking that's still to happen can be rescheduled."
          : "Only a confirmed booking at least 72 hours away can be rescheduled. Please contact the salon.",
      },
      { status: 409 },
    );
  }
  const slot = await checkSlot({ nailistId: oldAppt.nailist_id, date: newDate, time: newTime, excludeAppointmentId: id });
  if (!slot.ok) return Response.json({ code: slot.code, message: slot.message }, { status: slot.status });

  try {
    // Only while it's still in the status checked above
    const [moved] = await getSql()`
      update appointments set appointment_date = ${newDate}, appointment_time = ${slot.time}
      where id = ${id} and upper(trim(status)) = ${status}
      returning id
    `;
    if (!moved) return Response.json({ code: "NOT_RESCHEDULABLE", message: "This booking changed meanwhile. Please reload it." }, { status: 409 });
  } catch (error) {
    if (isSlotConflict(error)) return Response.json({ message: "Time slot already booked" }, { status: 409 });
    throw error;
  }
  const updated = await getAppointment(id);

  inBackground("reschedule email", () =>
    sendRescheduleEmails({
      email: oldAppt.email || "", name: oldAppt.client_name || "Client", service: oldAppt.service_name,
      oldDate: oldAppt.appointment_date, oldTime: oldAppt.appointment_time, newDate, newTime: slot.time,
      artist: oldAppt.nailist_name, appointmentId: id, byClient: requester.role !== "admin",
    }),
  );
  return Response.json({ message: "Rescheduled", appointment: updated });
});

// POST /booking/:id/refund (owner or admin): cancel, refunding when it's at least 72 hours
// before the appointment (Xendit refund, or a manual refund for payment-proof payments).
export const refundAppointment = ported<IdContext>(async (_req, { params }) => {
  const requester = await requireUserRow();
  if (requester instanceof Response) return requester;
  const id = toId((await params).id);
  if (id === null) return Response.json({ message: "Appointment not found" }, { status: 404 });
  const app = await getAppointment(id);
  if (!app) return Response.json({ message: "Appointment not found" }, { status: 404 });
  if (!canAccess(requester, app.user_id)) return Response.json({ error: "Forbidden" }, { status: 403 });

  // The appointment row stays locked while the refund runs, so a double click (or the client and
  // an admin at once) can't refund twice: the second request waits, then sees it cancelled.
  const result = await getSql().begin(async (tx) => {
    const [locked] = await tx<{ status: string | null }[]>`select status from appointments where id = ${id} for update`;
    const currentStatus = statusOf(locked?.status);
    if (currentStatus === "REFUNDED" || currentStatus === "CANCELLED") {
      return Response.json({ message: "Already cancelled or refunded." }, { status: 400 });
    }
    // A completed visit or a no-show is a record of what happened, not a booking to cancel; and a
    // client can't cancel a visit once its time has come (an admin still can, from the list)
    if (!OPEN_STATUSES.includes(currentStatus)) {
      return Response.json({ message: "Only a booking that's still to happen can be cancelled." }, { status: 400 });
    }
    if (requester.role !== "admin" && appointmentStarted(app.appointment_date, app.appointment_time)) {
      return Response.json({ message: "This appointment has already started. Please contact the salon." }, { status: 400 });
    }

    const eligibleForRefund = isEligibleForChanges(app.appointment_date, app.appointment_time);
    // A payment proof approved by an admin has no Xendit invoice, so its refund is done manually
    const [manualPayment] = await tx<{ amount: number }[]>`
      select amount from payments where appointment_id = ${id} and payment_method = 'MANUAL' and upper(status) = 'PAID' limit 1
    `;
    const isPaid = Boolean(manualPayment) || app.payment_status === "PAID" || app.payment_status === "SETTLED";

    let finalStatus = "CANCELLED";
    let isLateCancellation = false;
    let manualRefundAmount: number | undefined;
    let manualRefundReason: "proof" | "gateway" = "proof";

    if (eligibleForRefund && manualPayment) {
      finalStatus = "REFUNDED";
      manualRefundAmount = Number(manualPayment.amount);
    } else if (eligibleForRefund && isPaid && app.payment_reference) {
      try {
        const invoices = await getXenditInvoices(app.payment_reference);
        if (!Array.isArray(invoices) || invoices.length === 0) throw new Error("Payment record could not be found in the gateway.");
        await createXenditRefund(invoices[0]);
        finalStatus = "REFUNDED";
      } catch (e) {
        // Xendit can't refund every channel (QR Ph, the one clients pay with, isn't refundable through
        // its API). The booking is cancelled all the same and the refund is sent by hand: the salon is
        // told, rather than the client being left with a booking they can't cancel.
        console.error("XENDIT REFUND CATCH:", e instanceof Error ? e.message : String(e));
        const [paidRow] = await tx<{ amount: number }[]>`
          select coalesce(sum(amount), 0)::int as amount from payments where appointment_id = ${id} and upper(trim(status)) = 'PAID'
        `;
        finalStatus = "REFUNDED";
        manualRefundAmount = Number(paidRow?.amount ?? 0);
        manualRefundReason = "gateway";
      }
    } else {
      if (isPaid && !eligibleForRefund) isLateCancellation = true;
      if (app.payment_reference) {
        try {
          const invoices = await getXenditInvoices(app.payment_reference);
          if (invoices?.[0]?.status === "PENDING" && invoices[0].id) await expireXenditInvoice(invoices[0].id);
        } catch {
          // Ignore expiration errors
        }
      }
    }

    // No expiry any more: a late payment for it then doesn't bring it back (the webhook only revives
    // a booking whose hold ran out). Dated for the Sales page's money (it was still to happen, so
    // this is when it was cancelled).
    await tx`
      update appointments set status = ${finalStatus}, expires_at = null,
        cancelled_at = clawholics_utc_now(),
        refunded_at = case when ${finalStatus} = 'REFUNDED' then clawholics_utc_now() else refunded_at end
      where id = ${id}`;
    return { finalStatus, isLateCancellation, manualRefundAmount, manualRefundReason };
  });
  if (result instanceof Response) return result;
  const { finalStatus, isLateCancellation, manualRefundAmount, manualRefundReason } = result;

  inBackground("cancellation email", () =>
    sendCancellationEmails({
      email: app.email || "", name: app.client_name || "Client", service: app.service_name,
      date: app.appointment_date, time: app.appointment_time, artist: app.nailist_name, status: finalStatus,
      appointmentId: app.id, isLateCancellation, manualRefundAmount, manualRefundReason, byClient: requester.role !== "admin",
    }),
  );
  // A refund to send by hand also goes to the admins' bell, which is where they look (the emails to
  // the salon were cut back)
  const refundByHand = manualRefundAmount !== undefined;
  if (refundByHand) inBackground("refund notification", () => notifyAdmins("refund_to_send", id, id));
  return Response.json({
    message: `Appointment ${finalStatus.toLowerCase()} successfully.`,
    status: finalStatus,
    ...(refundByHand ? { refundByHand: true, refundAmount: manualRefundAmount } : {}),
  });
});
