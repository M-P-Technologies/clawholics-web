import { describe, expect, it } from "vitest";
import { eventWindow, googleCalendarUrl, icsContent, icsFilename, type CalendarEvent } from "@/lib/calendarEvent";

// 13:00-15:00 in Manila (UTC+8) on 21 Oct 2026 is 05:00-07:00 UTC
const event: CalendarEvent = {
  id: 7, service: "Gel Manicure", artist: "Maxine", date: "2026-10-21", time: "13:00-15:00",
  location: "7th 3rd Street, Nazareth, Cagayan de Oro", manageUrl: "https://clawholicsbymax.com/my/appointments",
};
const NOW = Date.UTC(2026, 9, 20, 1, 0);

describe("eventWindow", () => {
  it("reads when the visit starts and ends, in Manila time", () => {
    expect(eventWindow("2026-10-21", "13:00-15:00")).toEqual({ start: Date.UTC(2026, 9, 21, 5, 0), end: Date.UTC(2026, 9, 21, 7, 0) });
  });

  it("makes it an hour when there's no end time, or the end isn't after the start", () => {
    expect(eventWindow("2026-10-21", "13:00")).toEqual({ start: Date.UTC(2026, 9, 21, 5, 0), end: Date.UTC(2026, 9, 21, 6, 0) });
    expect(eventWindow("2026-10-21", "13:00-12:00")?.end).toBe(Date.UTC(2026, 9, 21, 6, 0));
  });

  it("is null when the date or time can't be read", () => {
    expect(eventWindow("soon", "13:00-15:00")).toBeNull();
    expect(eventWindow("2026-10-21", "noon")).toBeNull();
  });
});

describe("icsContent", () => {
  const ics = icsContent(event, NOW)!;
  const lines = ics.split("\r\n");

  it("is a calendar with one event at the visit's time", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines).toContain("UID:appointment-7@clawholicsbymax.com");
    expect(lines).toContain("DTSTART:20261021T050000Z");
    expect(lines).toContain("DTEND:20261021T070000Z");
    expect(lines).toContain("SUMMARY:Gel Manicure at Clawholics by Max");
    expect(lines).toContain("STATUS:CONFIRMED");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
  });

  it("ends every line with CRLF, as the format requires", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("escapes commas and line breaks in text, and keeps the address and booking details", () => {
    expect(lines).toContain("LOCATION:7th 3rd Street\\, Nazareth\\, Cagayan de Oro");
    const description = ics.replace(/\r\n /g, "").split("\r\n").find((l) => l.startsWith("DESCRIPTION:"))!;
    expect(description).toBe("DESCRIPTION:Booking #7\\nWith Maxine\\nManage your appointment: https://clawholicsbymax.com/my/appointments");
  });

  it("folds long lines at 75 octets without losing anything", () => {
    const long = icsContent({ ...event, service: "A".repeat(120) }, NOW)!;
    for (const line of long.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(long.replace(/\r\n /g, "")).toContain(`SUMMARY:${"A".repeat(120)} at Clawholics by Max`);
  });

  it("gives a moved booking a newer SEQUENCE under the same UID, so calendars update it", () => {
    const first = icsContent(event, NOW)!;
    const later = icsContent({ ...event, date: "2026-10-22" }, NOW + 3600_000)!;
    const sequence = (text: string) => Number(/SEQUENCE:(\d+)/.exec(text)![1]);
    expect(sequence(later)).toBeGreaterThan(sequence(first));
    expect(later).toContain("UID:appointment-7@clawholicsbymax.com");
  });

  it("leaves out the address and the artist when they're not known, and is null for an unreadable time", () => {
    const bare = icsContent({ id: 9, service: "Gel", date: "2026-10-21", time: "13:00-15:00" }, NOW)!;
    expect(bare).not.toContain("LOCATION");
    expect(bare).toContain("DESCRIPTION:Booking #9\r\n");
    expect(icsContent({ ...event, time: "noon" }, NOW)).toBeNull();
  });
});

describe("googleCalendarUrl", () => {
  it("opens Google Calendar with the visit filled in", () => {
    const url = new URL(googleCalendarUrl(event)!);
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Gel Manicure at Clawholics by Max");
    expect(url.searchParams.get("dates")).toBe("20261021T050000Z/20261021T070000Z");
    expect(url.searchParams.get("location")).toBe("7th 3rd Street, Nazareth, Cagayan de Oro");
    expect(url.searchParams.get("details")).toContain("Booking #7");
  });

  it("is null when the time can't be read", () => {
    expect(googleCalendarUrl({ ...event, date: "soon" })).toBeNull();
  });
});

describe("icsFilename", () => {
  it("names the file after the booking", () => {
    expect(icsFilename(event)).toBe("clawholics-appointment-7.ics");
  });
});

describe("icsContent for a cancelled booking", () => {
  it("is the cancellation of the same event, with a newer sequence", () => {
    const confirmed = icsContent(event, NOW)!;
    const cancelled = icsContent(event, NOW + 3600_000, true)!;
    expect(cancelled).toContain("METHOD:CANCEL");
    expect(cancelled).toContain("STATUS:CANCELLED");
    expect(cancelled).not.toContain("METHOD:PUBLISH");
    const uid = (text: string) => text.match(/UID:(.+)/)![1];
    const seq = (text: string) => Number(text.match(/SEQUENCE:(\d+)/)![1]);
    expect(uid(cancelled)).toBe(uid(confirmed));
    expect(seq(cancelled)).toBeGreaterThan(seq(confirmed));
  });
});
