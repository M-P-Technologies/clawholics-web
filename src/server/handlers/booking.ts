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
import { sendAppointmentConfirmation, sendCancellationEmails, sendConfirmationEmail, sendRescheduleEmails } from "../email";
import { inBackground, readJson, routeNotFound, toId } from "../http";
import { createXenditRefund, expireXenditInvoice, getXenditInvoices } from "../payments";
import { usableProof } from "../proofRules";
import { ported } from "../worker";

// Booking and appointment routes, ported from worker-api/src/index.ts (~lines 1705-2022).
// Bodies, status codes and messages match the Worker. What's new is who may call them: the
// Worker trusted anyone, here the Clerk-verified session decides (owner of the appointment,
// or an admin).

type IdContext = { params: Promise<{ id: string }> };

const SLOT_TAKEN = { error: true, message: "Time slot already booked" };
const BOOKING_HOLD_MS = 5 * 60 * 1000;

// GET /booking/nailists[?service_id=] (public): artists, or the ones offering a service with
// the price each charges for it.
export const getBookingNailists = ported(async (req) => {
  const sql = getSql();
  const serviceParam = new URL(req.url).searchParams.get("service_id");
  if (serviceParam) {
    // Hidden/archived services have no bookable artists
    const serviceId = toId(serviceParam);
    if (serviceId === null || !(await isServiceBookable(serviceId))) return Response.json([]);
    return Response.json(await sql`
      select distinct n.id, n.name, n.category_id, nc.name as position, n.specialty, n.bio, n.image,
        ${sql.unsafe(SERVICE_PRICE_SQL)} as service_price
      from nailists n
      inner join nailist_services ns on n.id = ns.nailist_id
      inner join services s on s.id = ns.service_id
      left join nailist_categories nc on n.category_id = nc.id
      where ns.service_id = ${serviceId}
      order by n.id
    `);
  }
  return Response.json(await sql`
    select n.id, n.name, n.category_id, nc.name as position, n.specialty, n.bio, n.image
    from nailists n left join nailist_categories nc on n.category_id = nc.id
    order by n.id
  `);
});

// GET /booking/slots-detailed and /appointments/booked-slots (public): taken times only, by
// holdsSlot. Unpaid holds past their 5 minutes are released first, as booking does before its
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
export const MAX_SLOTS_RANGE_DAYS = 62;

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

// POST /booking/create (signed in): the client's own booking, held for 5 minutes until paid.
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
  const [pending] = await sql`select id from appointments where user_id = ${requester.id} and upper(status) = 'PENDING'`;
  if (pending) {
    return Response.json(
      { error: true, code: "PENDING_APPOINTMENT_EXISTS", message: "You already have an unpaid pending appointment." },
      { status: 409 },
    );
  }
  const [taken] = await sql`
    select 1 from appointments
    where nailist_id = ${nailistId} and appointment_date = ${String(b.appointment_date)} and appointment_time = ${String(b.appointment_time)}
      and ${sql.unsafe(holdsSlot())}
  `;
  if (taken) return Response.json(SLOT_TAKEN, { status: 409 });

  const expiresAt = new Date(Date.now() + BOOKING_HOLD_MS).toISOString();
  try {
    const [created] = await sql<{ id: number }[]>`
      insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status, expires_at)
      values (${requester.id}, ${serviceId}, ${String(b.service_name ?? "")}, ${nailistId}, ${String(b.nailist_name ?? "")},
        ${String(b.appointment_date)}, ${String(b.appointment_time)}, 'PENDING', ${expiresAt})
      returning id
    `;
    return Response.json({ appointment_id: created.id, expires_at: expiresAt, status: "PENDING" });
  } catch (error) {
    // Two clients racing for the same slot: the unique index lets only one in
    if (isSlotConflict(error)) return Response.json(SLOT_TAKEN, { status: 409 });
    throw error;
  }
});

// POST /booking/admin/create (admin): a confirmed walk-in or phone booking.
export const createAdminBooking = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  await cancelExpiredPendingAppointments();
  const b = await readJson<Record<string, string | number | undefined>>(req);
  const { first_name, last_name, phone, email, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time } = b;

  if (!first_name || !last_name || !phone || !service_id || !service_name || !nailist_id || !nailist_name || !appointment_date || !appointment_time) {
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
  const [taken] = await sql`
    select 1 from appointments
    where nailist_id = ${nailistId} and appointment_date = ${String(appointment_date)} and appointment_time = ${String(appointment_time)}
      and ${sql.unsafe(holdsSlot())}
  `;
  if (taken) return Response.json(slotTaken, { status: 409 });

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

  const expiresAt = new Date(Date.now() + BOOKING_HOLD_MS).toISOString();
  let createdId: number;
  try {
    const [created] = await sql<{ id: number }[]>`
      insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status, expires_at,
        walkin_first_name, walkin_last_name, walkin_phone, walkin_email)
      values (${userId}, ${toId(service_id)!}, ${String(service_name)}, ${nailistId}, ${String(nailist_name)},
        ${String(appointment_date)}, ${String(appointment_time)}, 'CONFIRMED', ${expiresAt},
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
    inBackground("walk-in confirmation email", () =>
      sendConfirmationEmail({
        appointment_id: appt.id, payment_id: "WALK-IN", user_id: appt.user_id, customer_email: appt.email,
        customer_name: appt.client_name, nailist_name: appt.nailist_name, service_name: appt.service_name,
        service_price: appt.service_price, duration: appt.duration, appointment_date: appt.appointment_date,
        appointment_time: appt.appointment_time, payment_method: "WALK-IN", service_id: appt.service_id, nailist_id: appt.nailist_id,
      }),
    );
  }
  return Response.json(appt, { status: 201 });
});

/** The most rows one page of the admin list returns */
export const MAX_APPOINTMENT_PAGE_SIZE = 50;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// GET /booking/appointments and /appointments[?status=A,B] (admin): every appointment.
// With ?page=N it answers one page instead, as { rows, total, page, pageSize }, filtered by
// status (A,B), proof=review, on or from (YYYY-MM-DD), artist and q, and sorted by
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

class ScreenshotGone extends Error {}

// PATCH /booking/appointments/:id/status and /appointments/:id/status (admin)
export const updateAppointmentStatus = ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  const { status, without_screenshot } = await readJson<{ status?: unknown; without_screenshot?: unknown }>(req);
  const upperStatus = String(status || "").trim().toUpperCase();
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
  // Confirming a booking paid online needs the client's screenshot of the payment; confirming
  // approves it
  // "Allow anyway": the admin checked the payment arrived though the client sent no screenshot
  const confirmingPaid = upperStatus === "CONFIRMED" && was === "AWAITING_CONFIRMATION" && without_screenshot !== true;
  const proof = confirmingPaid ? await usableProof(id) : null;
  if (confirmingPaid && !proof) {
    return Response.json(
      { error: true, code: "PROOF_REQUIRED", message: "The client hasn't sent a screenshot of their payment yet." },
      { status: 409 },
    );
  }
  const reviewer = proof?.status === "PENDING" ? await requireUserRow() : null;

  let confirmedPaidBooking = false;
  try {
    // Confirming a booking the client paid online (AWAITING_CONFIRMATION) is what confirms it for
    // them: that's when the confirmation email goes out
    confirmedPaidBooking = await sql.begin(async (tx) => {
      // The screenshot read above may have been rejected since: checked again, locked, before confirming
      if (confirmingPaid) {
        const [latest] = await tx<{ status: string }[]>`
          select status from payment_proofs where appointment_id = ${id}
          order by created_at desc, id desc limit 1 for update`;
        if (latest?.status !== "PENDING" && latest?.status !== "APPROVED") throw new ScreenshotGone();
      }
      const [changed] = await tx<{ was: string | null }[]>`
        update appointments a set status = ${upperStatus}
        from (select id, status as was from appointments where id = ${id}) old
        where a.id = old.id
        returning old.was
      `;
      const confirmed = upperStatus === "CONFIRMED" && String(changed?.was ?? "").trim().toUpperCase() === "AWAITING_CONFIRMATION";
      if (confirmed && proof?.status === "PENDING") {
        await tx`
          update payment_proofs set status = 'APPROVED', reviewed_by = ${reviewer instanceof Response ? null : reviewer?.id ?? null},
            updated_at = clawholics_utc_now()
          where id = ${proof.id} and status = 'PENDING'
        `;
      }
      // Leaving COMPLETED: the visit's record (what was paid, who did it) no longer stands
      if (was === "COMPLETED" && upperStatus !== "COMPLETED") {
        await tx`delete from visit_completions where appointment_id = ${id}`;
      }
      return confirmed;
    });
  } catch (error) {
    if (error instanceof ScreenshotGone) {
      return Response.json(
        { error: true, code: "PROOF_REQUIRED", message: "The client's payment screenshot was just rejected. Ask them for a new one." },
        { status: 409 },
      );
    }
    // e.g. re-activating a cancelled booking whose slot was taken since
    if (isSlotConflict(error)) {
      return Response.json(
        { error: true, code: "SLOT_TAKEN", message: "This appointment slot is already taken by another active appointment." },
        { status: 409 },
      );
    }
    throw error;
  }
  if (confirmedPaidBooking) inBackground("booking confirmation email", () => sendAppointmentConfirmation(id));
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

// POST /booking/:id/reschedule (owner or admin)
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
  try {
    await getSql()`update appointments set appointment_date = ${newDate}, appointment_time = ${newTime} where id = ${id}`;
  } catch (error) {
    if (isSlotConflict(error)) return Response.json({ message: "Time slot already booked" }, { status: 409 });
    throw error;
  }
  const updated = await getAppointment(id);

  inBackground("reschedule email", () =>
    sendRescheduleEmails({
      email: oldAppt.email || "", name: oldAppt.client_name || "Client", service: oldAppt.service_name,
      oldDate: oldAppt.appointment_date, oldTime: oldAppt.appointment_time, newDate, newTime,
      artist: oldAppt.nailist_name, appointmentId: id, userId: oldAppt.user_id,
      serviceId: oldAppt.service_id, nailistId: oldAppt.nailist_id,
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
    const currentStatus = String(locked?.status || "").toUpperCase();
    if (currentStatus === "REFUNDED" || currentStatus === "CANCELLED") {
      return Response.json({ message: "Already cancelled or refunded." }, { status: 400 });
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
        const message = e instanceof Error ? e.message : String(e);
        console.error("XENDIT REFUND CATCH:", message);
        return Response.json(
          { message: `Refund processing error: ${message}. Please contact the salon for manual assistance.` },
          { status: 400 },
        );
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

    await tx`update appointments set status = ${finalStatus} where id = ${id}`;
    return { finalStatus, isLateCancellation, manualRefundAmount };
  });
  if (result instanceof Response) return result;
  const { finalStatus, isLateCancellation, manualRefundAmount } = result;

  inBackground("cancellation email", () =>
    sendCancellationEmails({
      email: app.email || "", name: app.client_name || "Client", service: app.service_name,
      date: app.appointment_date, time: app.appointment_time, artist: app.nailist_name, status: finalStatus,
      appointmentId: app.id, userId: app.user_id, serviceId: app.service_id, nailistId: app.nailist_id,
      isLateCancellation, manualRefundAmount,
    }),
  );
  return Response.json({ message: `Appointment ${finalStatus.toLowerCase()} successfully.`, status: finalStatus });
});
