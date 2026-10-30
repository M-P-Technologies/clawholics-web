import { slotStartMs } from "@/lib/bookingNotice";

// An appointment as a calendar event: a downloadable .ics file (Apple Calendar, Outlook, Google)
// and a Google Calendar link. Times are Manila (UTC+8), written as UTC so every calendar app
// shows them at the right hour wherever the client is. Shared by the emails (server) and the
// client app's "Add to calendar" button (browser).

export interface CalendarEvent {
  /** The booking's number: the event's identity, so a moved booking updates its event instead of adding another */
  id: number;
  service: string;
  artist?: string;
  /** YYYY-MM-DD */
  date: string;
  /** "13:00-15:00" */
  time: string;
  /** The salon's address */
  location?: string;
  /** Where the client manages the booking */
  manageUrl?: string;
}

const HOUR_MS = 3600_000;
const UID_DOMAIN = "clawholicsbymax.com";

/** When the visit starts and ends, or null when the date or time isn't readable. No end time: an hour. */
export function eventWindow(date: string, time: string): { start: number; end: number } | null {
  const start = slotStartMs(date, time);
  if (start === null) return null;
  const secondHalf = time.split("-")[1];
  const end = secondHalf ? slotStartMs(date, secondHalf) : null;
  return { start, end: end !== null && end > start ? end : start + HOUR_MS };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** 1761010800000 → "20251021T030000Z" */
const utcStamp = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};

const title = (e: CalendarEvent) => `${e.service} at Clawholics by Max`;

const description = (e: CalendarEvent) =>
  [`Booking #${e.id}`, e.artist ? `With ${e.artist}` : "", e.manageUrl ? `Manage your appointment: ${e.manageUrl}` : ""].filter(Boolean);

/** Escapes a TEXT value for an .ics file (RFC 5545 §3.3.11) */
const escapeText = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Folds a content line at 75 octets, as the format requires, without splitting a character */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  // The first line may hold 75 octets; each continuation starts with a space, leaving 74
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** The .ics file's text, or null when the visit's date or time isn't readable */
export function icsContent(event: CalendarEvent, now: number = Date.now()): string | null {
  const window = eventWindow(event.date, event.time);
  if (!window) return null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clawholics by Max//Appointments//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:appointment-${event.id}@${UID_DOMAIN}`,
    `DTSTAMP:${utcStamp(now)}`,
    // Rises with every file made, so a calendar that already has this booking takes the newer one (a reschedule)
    `SEQUENCE:${Math.floor(now / 60_000)}`,
    `DTSTART:${utcStamp(window.start)}`,
    `DTEND:${utcStamp(window.end)}`,
    `SUMMARY:${escapeText(title(event))}`,
    `DESCRIPTION:${escapeText(description(event).join("\n"))}`,
    event.location ? `LOCATION:${escapeText(event.location)}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** A link that adds the visit to Google Calendar, or null when the date or time isn't readable */
export function googleCalendarUrl(event: CalendarEvent): string | null {
  const window = eventWindow(event.date, event.time);
  if (!window) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title(event),
    dates: `${utcStamp(window.start)}/${utcStamp(window.end)}`,
    details: description(event).join("\n"),
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params}`;
}

export const icsFilename = (event: CalendarEvent) => `clawholics-appointment-${event.id}.ics`;
