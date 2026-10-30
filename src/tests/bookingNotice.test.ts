import { describe, expect, it } from "vitest";
import { manilaToday, noticeText, slotStartMs, startsTooSoon } from "@/lib/bookingNotice";

// 2026-10-20 09:30 in Manila (UTC+8) is 01:30 UTC
const NOW = Date.UTC(2026, 9, 20, 1, 30);

describe("Manila time for bookings", () => {
  it("knows today's date in Manila, whatever the visitor's timezone", () => {
    expect(manilaToday(NOW)).toBe("2026-10-20");
    // 17:00 UTC on the 20th is already 01:00 on the 21st in Manila
    expect(manilaToday(Date.UTC(2026, 9, 20, 17, 0))).toBe("2026-10-21");
  });

  it("reads when a slot starts", () => {
    expect(slotStartMs("2026-10-20", "10:00-12:00")).toBe(Date.UTC(2026, 9, 20, 2, 0));
    expect(slotStartMs("2026-10-20", "9:00-11:00")).toBe(Date.UTC(2026, 9, 20, 1, 0));
    expect(slotStartMs("soon", "10:00-12:00")).toBeNull();
    expect(slotStartMs("2026-10-20", "noon")).toBeNull();
  });
});

describe("startsTooSoon", () => {
  it("refuses a slot that starts within the notice, and offers one from the notice on", () => {
    // 09:30 now, 2 hours' notice: 11:30 is the first start that works
    expect(startsTooSoon("2026-10-20", "10:00-12:00", 2, NOW)).toBe(true);
    expect(startsTooSoon("2026-10-20", "11:00-12:00", 2, NOW)).toBe(true);
    expect(startsTooSoon("2026-10-20", "11:30-12:30", 2, NOW)).toBe(true); // exactly at the limit: not enough notice
    expect(startsTooSoon("2026-10-20", "12:00-13:00", 2, NOW)).toBe(false);
  });

  it("with no notice, only a slot that has started is refused", () => {
    expect(startsTooSoon("2026-10-20", "09:00-10:00", 0, NOW)).toBe(true);
    expect(startsTooSoon("2026-10-20", "09:30-10:30", 0, NOW)).toBe(true);
    expect(startsTooSoon("2026-10-20", "10:00-11:00", 0, NOW)).toBe(false);
  });

  it("counts the notice across midnight", () => {
    // 23:00 Manila on the 20th, 3 hours' notice: tomorrow 01:00 is too soon, 02:30 is fine
    const late = Date.UTC(2026, 9, 20, 15, 0);
    expect(startsTooSoon("2026-10-21", "01:00-02:00", 3, late)).toBe(true);
    expect(startsTooSoon("2026-10-21", "02:30-03:30", 3, late)).toBe(false);
  });

  it("leaves a date or time it can't read to the other checks", () => {
    expect(startsTooSoon("soon", "10:00-11:00", 2, NOW)).toBe(false);
  });
});

describe("noticeText", () => {
  it("puts the apostrophe where it belongs", () => {
    expect(noticeText(1)).toBe("1 hour's notice");
    expect(noticeText(2)).toBe("2 hours' notice");
  });
});
