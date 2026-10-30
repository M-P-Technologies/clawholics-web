// How much notice a booking needs (site setting booking_min_notice_hours, edited in Admin >
// Settings): a slot that starts sooner than that isn't offered, and the server refuses it. The
// salon is in Manila (UTC+8), so times are worked out there, not in the visitor's own timezone.
// An admin recording a walk-in or moving a booking isn't held to it.

export const DEFAULT_MIN_NOTICE_HOURS = 2;
export const MIN_MIN_NOTICE_HOURS = 0;
export const MAX_MIN_NOTICE_HOURS = 72;

const MANILA_OFFSET_MS = 8 * 3600_000;

/** Today's date in Manila, as YYYY-MM-DD */
export function manilaToday(now: number = Date.now()): string {
  return new Date(now + MANILA_OFFSET_MS).toISOString().slice(0, 10);
}

/** When a slot starts ("2026-10-20", "09:00-11:00"), as a timestamp, or null when either isn't readable */
export function slotStartMs(date: string, slot: string): number | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const clock = /^\s*(\d{1,2}):(\d{2})/.exec(slot);
  if (!day || !clock) return null;
  return Date.UTC(Number(day[1]), Number(day[2]) - 1, Number(day[3]), Number(clock[1]), Number(clock[2])) - MANILA_OFFSET_MS;
}

/** The slot starts within `minNoticeHours` from now (or has started): too soon to book */
export function startsTooSoon(date: string, slot: string, minNoticeHours: number, now: number = Date.now()): boolean {
  const start = slotStartMs(date, slot);
  return start !== null && start <= now + minNoticeHours * 3600_000;
}

/** "1 hour's notice" or "3 hours' notice", for the words the client reads */
export const noticeText = (hours: number) => `${hours} ${hours === 1 ? "hour's" : "hours'"} notice`;
