import "server-only";
import { isServiceBookable, nailistOffersService } from "../appointments";
import { requireUserRow } from "../auth";
import { getBookingMaxAdvanceDays } from "../bookingWindow";
import { getSql } from "../db";
import { readJson, routeNotFound, toId } from "../http";
import { dayHasFreeTime, MAX_WAITING_ENTRIES } from "../waitlist";
import { manilaToday } from "../../lib/bookingNotice";
import { lastBookableDay } from "../../lib/bookingWindow";
import { ported } from "../worker";

// The waitlist routes (server/waitlist.ts): a signed-in client asks to be told if a time opens up on a
// fully booked day, sees who they're waiting for, and leaves. Only their own entries.

type IdContext = { params: Promise<{ id: string }> };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const errorBody = (message: string, status: number, code?: string) => Response.json({ error: true, message, ...(code ? { code } : {}) }, { status });

async function requireClient() {
  const requester = await requireUserRow();
  if (requester instanceof Response) return requester;
  if (requester.id === null) return errorBody("User ID is required", 400);
  return requester as typeof requester & { id: number };
}

// GET /waitlist (signed in): the days the client is waiting for, soonest first
export const getMyWaitlist = ported(async () => {
  const client = await requireClient();
  if (client instanceof Response) return client;
  return Response.json(await getSql()`
    select w.id, w.service_id, s.name as service_name, w.nailist_id, n.name as nailist_name, w.appointment_date, w.created_at
    from waitlist_entries w
    join services s on s.id = w.service_id
    left join nailists n on n.id = w.nailist_id
    where w.user_id = ${client.id} and w.notified_at is null and w.appointment_date >= ${manilaToday()}
    order by w.appointment_date, w.id`);
});

// POST /waitlist (signed in) { service_id, nailist_id?, date }: wait for a time on a fully booked day,
// with one artist (nailist_id) or any artist who does the service. Joining twice is fine.
export const joinWaitlist = ported(async (req) => {
  const client = await requireClient();
  if (client instanceof Response) return client;
  const body = await readJson<{ service_id?: unknown; nailist_id?: unknown; date?: unknown }>(req);
  const serviceId = toId(body.service_id);
  const nailistId = body.nailist_id === null || body.nailist_id === undefined ? null : toId(body.nailist_id);
  const date = typeof body.date === "string" ? body.date : "";
  if (serviceId === null || (body.nailist_id != null && nailistId === null) || !DAY.test(date)) {
    return errorBody("service_id, date (YYYY-MM-DD) and, if one artist, nailist_id are required.", 400);
  }
  if (!(await isServiceBookable(serviceId))) return errorBody("This service is no longer available.", 400);
  if (nailistId !== null && !(await nailistOffersService(nailistId, serviceId))) return errorBody("The selected artist doesn't offer this service.", 400);
  // Only a day a client could book: from today to the end of the booking window
  if (date < manilaToday() || date > lastBookableDay(await getBookingMaxAdvanceDays())) {
    return errorBody("That day isn't open for booking.", 400, "OUT_OF_WINDOW");
  }
  // A day with a time free is booked, not waited for
  if (await dayHasFreeTime(serviceId, date, nailistId)) {
    return errorBody("That day has times free: you can book one now.", 409, "NOT_FULL");
  }

  const sql = getSql();
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from waitlist_entries where user_id = ${client.id} and notified_at is null and appointment_date >= ${manilaToday()}`;
  const [created] = await sql<{ id: number }[]>`
    insert into waitlist_entries (user_id, service_id, nailist_id, appointment_date)
    select ${client.id}::int, ${serviceId}::int, ${nailistId}::int, ${date}::text
    where ${n}::int < ${MAX_WAITING_ENTRIES}::int
    on conflict do nothing
    returning id`;
  if (created) return Response.json({ id: created.id, already: false }, { status: 201 });

  // Already waiting for that day (a repeat), or at the limit
  const [existing] = await sql<{ id: number }[]>`
    select id from waitlist_entries
    where user_id = ${client.id} and service_id = ${serviceId} and coalesce(nailist_id, 0) = ${nailistId ?? 0}::int and appointment_date = ${date} and notified_at is null`;
  if (existing) return Response.json({ id: existing.id, already: true });
  return errorBody(`You can wait for up to ${MAX_WAITING_ENTRIES} days at a time. Leave one to add another.`, 409, "WAITLIST_FULL");
});

// DELETE /waitlist/:id (signed in): stop waiting. Only the client's own entry.
export const leaveWaitlist = ported<IdContext>(async (_req, { params }) => {
  const client = await requireClient();
  if (client instanceof Response) return client;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  const [removed] = await getSql()<{ id: number }[]>`delete from waitlist_entries where id = ${id} and user_id = ${client.id} returning id`;
  return removed ? Response.json({ message: "Removed from the waitlist." }) : routeNotFound();
});
