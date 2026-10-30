import "server-only";
import { holdsSlot } from "./appointments";
import { getSql } from "./db";
import { manilaNow } from "./visitsToComplete";
import { noticeText, startsTooSoon } from "../lib/bookingNotice";
import { daysLabel, isBeyondWindow } from "../lib/bookingWindow";

// The rules a booked date and time must meet, checked on the server for every booking, walk-in
// and reschedule (the calendars apply the same ones, but a request can skip them): a real date,
// one of the artist's time slots, not on their day off, not taken, and (except for admins
// recording a walk-in) not already started. Times are stored as the slot list writes them,
// "HH:MM-HH:MM", so the one-booking-per-slot index compares like with like.

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const RANGE = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*-\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*$/;

const pad = (h: string, m: string) => `${h.padStart(2, "0")}:${m}`;

/** "9:00 - 11:00" → "09:00-11:00"; null when it isn't a time range */
export function normalizeSlot(time: string): string | null {
  const match = RANGE.exec(time);
  return match ? `${pad(match[1], match[2])}-${pad(match[3], match[4])}` : null;
}

/** A real calendar day written YYYY-MM-DD */
function isValidDate(date: string) {
  const match = DATE.exec(date);
  if (!match) return false;
  const day = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return day.toISOString().slice(0, 10) === date;
}

const minutes = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};

/** Two "HH:MM-HH:MM" ranges share some time */
export function slotsOverlap(a: string, b: string) {
  const [aStart, aEnd] = a.split("-").map((t) => minutes(t.trim()));
  const [bStart, bEnd] = b.split("-").map((t) => minutes(t.trim()));
  return aStart < bEnd && bStart < aEnd;
}

/** The slot's start has passed, Manila time */
export function hasStarted(date: string, slot: string, now: Date = new Date()) {
  const { today, clock } = manilaNow(now);
  return date < today || (date === today && minutes(slot.slice(0, 5)) <= minutes(clock));
}

type SlotCheck =
  | { ok: true; time: string }
  | { ok: false; status: number; code: string; message: string };

const refuse = (status: number, code: string, message: string): SlotCheck => ({ ok: false, status, code, message });

export async function checkSlot({
  nailistId,
  date,
  time,
  allowPast = false,
  excludeAppointmentId = null,
  minNoticeHours = 0,
  maxAdvanceDays,
  now = new Date(),
}: {
  nailistId: number;
  date: string;
  time: string;
  /** An admin recording a walk-in that already started */
  allowPast?: boolean;
  /** The appointment being moved, whose own time doesn't block it */
  excludeAppointmentId?: number | null;
  /** A client's booking needs this many hours' notice (Admin > Settings); admins pass none */
  minNoticeHours?: number;
  /** A client can't book further ahead than this many days (Admin > Settings); admins pass none */
  maxAdvanceDays?: number;
  now?: Date;
}): Promise<SlotCheck> {
  if (!isValidDate(date)) return refuse(400, "INVALID_DATE", "Please choose a valid date.");
  const slot = normalizeSlot(time);
  if (!slot) return refuse(400, "INVALID_TIME", "Please choose a valid time.");
  if (!allowPast && hasStarted(date, slot, now)) {
    return refuse(400, "SLOT_PAST", "This time has already passed. Please choose another one.");
  }
  if (!allowPast && minNoticeHours > 0 && startsTooSoon(date, slot, minNoticeHours, now.getTime())) {
    return refuse(400, "TOO_SOON", `Bookings need at least ${noticeText(minNoticeHours)}. Please choose a later time.`);
  }
  if (!allowPast && maxAdvanceDays !== undefined && isBeyondWindow(date, maxAdvanceDays, now.getTime())) {
    return refuse(400, "TOO_FAR", `Bookings open up to ${daysLabel(maxAdvanceDays)} ahead. Please choose an earlier date.`);
  }

  const sql = getSql();
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const [slots, [dayOff], taken] = await Promise.all([
    sql<{ start_time: string; end_time: string }[]>`
      select start_time, end_time from nailist_time_slots where nailist_id = ${nailistId}`,
    sql`
      select 1 from nailist_day_offs
      where nailist_id = ${nailistId}
        and ((day_off_type = 'REGULAR' and day_of_week = ${weekday}) or (day_off_type = 'CUSTOM' and date = ${date}))
      limit 1`,
    slotTaken(nailistId, date, slot, excludeAppointmentId),
  ]);

  if (!slots.some((s) => normalizeSlot(`${s.start_time}-${s.end_time}`) === slot)) {
    return refuse(400, "NOT_A_SLOT", "The artist doesn't take bookings at this time. Please choose one of their times.");
  }
  if (dayOff) return refuse(400, "DAY_OFF", "The artist is off on this day. Please choose another day.");
  if (taken) return refuse(409, "SLOT_TAKEN", "Time slot already booked");
  return { ok: true, time: slot };
}

/**
 * Another booking holding its slot overlaps this time. Older bookings may be stored as
 * "9:00-11:00", or at hours the artist has since changed, so times are compared as ranges.
 */
export async function slotTaken(nailistId: number, date: string, time: string, excludeAppointmentId: number | null = null) {
  const slot = normalizeSlot(time);
  if (!slot) return false;
  const sql = getSql();
  const held = await sql<{ appointment_time: string }[]>`
    select appointment_time from appointments
    where nailist_id = ${nailistId} and appointment_date = ${date} and ${sql.unsafe(holdsSlot())}
      ${excludeAppointmentId === null ? sql`` : sql`and id <> ${excludeAppointmentId}`}
  `;
  return held.some((t) => {
    const other = normalizeSlot(t.appointment_time);
    return other !== null && slotsOverlap(other, slot);
  });
}
