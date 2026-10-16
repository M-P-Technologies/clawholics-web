import { describe, expect, it } from "vitest";
import { agendaTimes } from "@/lib/admin/schedule";
import { clockLabel, longDateLabel, manilaDateTime, manilaTimeOfDay, timeRangeLabel } from "@/lib/timeFormat";

describe("timeFormat", () => {
  it("reads a 24-hour clock as 12-hour", () => {
    expect(clockLabel("00:30")).toBe("12:30 AM");
    expect(clockLabel("09:00")).toBe("9:00 AM");
    expect(clockLabel("12:00")).toBe("12:00 PM");
    expect(clockLabel("13:05:00")).toBe("1:05 PM");
    expect(clockLabel("25:00")).toBe("25:00");
    expect(clockLabel("9:75")).toBe("9:75");
  });

  it("formats an appointment's time range, keeping text it can't read", () => {
    expect(timeRangeLabel("09:00-11:00")).toBe("9:00 AM - 11:00 AM");
    expect(timeRangeLabel("13:00 - 14:30")).toBe("1:00 PM - 2:30 PM");
    expect(timeRangeLabel("15:00")).toBe("3:00 PM");
    expect(timeRangeLabel("09:00–11:00")).toBe("9:00 AM - 11:00 AM");
    expect(timeRangeLabel("2:00 PM")).toBe("2:00 PM");
    expect(timeRangeLabel("Walk-in")).toBe("Walk-in");
    expect(timeRangeLabel(null)).toBe("");
  });

  it("formats a calendar day without shifting it", () => {
    expect(longDateLabel("2026-10-01")).toBe("October 1, 2026");
    expect(longDateLabel("")).toBe("");
  });

  it("shows server times (UTC) in Manila time", () => {
    expect(manilaDateTime("2026-10-10 05:55:00")).toBe("Oct 10, 2026, 1:55 PM");
    expect(manilaDateTime("2026-10-10T16:30:00Z")).toBe("Oct 11, 2026, 12:30 AM");
    expect(manilaDateTime("")).toBe("");
    expect(manilaTimeOfDay(Date.UTC(2026, 9, 10, 5, 55))).toBe("1:55 PM");
    expect(manilaTimeOfDay(NaN)).toBe("");
  });

  it("keeps an agenda time already in 12-hour form", () => {
    expect(agendaTimes("13:00-15:00")).toEqual({ start: "1:00 PM", end: "3:00 PM" });
    expect(agendaTimes("1:00 PM - 3:00 PM")).toEqual({ start: "1:00 PM", end: "3:00 PM" });
  });
});
