import { parseServerTime } from "../services/serverTime";

// Times are shown as the salon reads them: 12-hour clock, Manila time.
const MANILA = "Asia/Manila";

/** "13:00" → "1:00 PM"; anything that isn't an "HH:MM" clock is returned as it came */
export const clockLabel = (hhmm: string): string => {
  const match = hhmm.trim().match(/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/);
  const hour = Number(match?.[1]);
  if (!match || hour > 23) return hhmm.trim();
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
};

/** An appointment's "09:00-11:00" → "9:00 AM - 11:00 AM"; text already in AM/PM (or unreadable) is kept */
export const timeRangeLabel = (range: string | null | undefined): string => {
  const text = range?.trim() ?? "";
  if (!text || /[ap]m/i.test(text)) return text;
  const parts = text.split(/[-–—]/).map((t) => t.trim()).filter(Boolean);
  if (!parts.length || !parts.every((t) => /^\d{1,2}:\d{2}(:\d{2})?$/.test(t))) return text;
  return parts.map(clockLabel).join(" - ");
};

/** A server time (UTC) as Manila date and time, e.g. "Oct 10, 2026, 1:55 PM"; "" when it can't be read */
export const manilaDateTime = (value?: string | null): string => {
  const time = parseServerTime(value);
  return Number.isNaN(time)
    ? ""
    : new Date(time).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: MANILA });
};

/** A moment's Manila clock time, e.g. "1:55 PM"; "" when it can't be read */
export const manilaTimeOfDay = (time: number | Date = Date.now()): string => {
  const date = new Date(time);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: MANILA });
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** An appointment's "2026-10-20" → "October 20, 2026", read as a calendar day (no time zone shift) */
export const longDateLabel = (ymd: string | null | undefined): string => {
  const match = ymd?.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match || !MONTHS[Number(match[2]) - 1]) return ymd?.trim() ?? "";
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
};
