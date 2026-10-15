import { describe, expect, it } from "vitest";
import {
  DASHBOARD_RANGES, addDays, isDashboardRange, manilaClock, manilaToday, monthKeys, resolvePeriod,
} from "@/features/dashboard/lib/dashboardPeriods";

describe("dashboard periods", () => {
  it("knows the five ranges", () => {
    expect(DASHBOARD_RANGES).toEqual(["week", "month", "last30", "last90", "year"]);
    expect(isDashboardRange("month")).toBe(true);
    expect(isDashboardRange("decade")).toBe(false);
    expect(isDashboardRange(undefined)).toBe(false);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("reads Manila's date and clock from a UTC instant", () => {
    const lateUtc = new Date("2026-10-13T16:30:00Z");
    expect(manilaToday(lateUtc)).toBe("2026-10-14");
    expect(manilaClock(lateUtc)).toBe("00:30");
    expect(manilaToday(new Date("2026-10-14T02:00:00Z"))).toBe("2026-10-14");
    expect(manilaClock(new Date("2026-10-14T02:00:00Z"))).toBe("10:00");
  });

  it("week is Monday to Sunday and compares with the week before", () => {
    expect(resolvePeriod("week", "2026-10-14")).toEqual({
      period: { from: "2026-10-12", to: "2026-10-18" },
      previous: { from: "2026-10-05", to: "2026-10-11" },
    });
    // a Sunday is the last day of its week, a Monday the first
    expect(resolvePeriod("week", "2026-10-18").period).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(resolvePeriod("week", "2026-10-12").period).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });

  it("month is the whole calendar month and compares with the month before", () => {
    expect(resolvePeriod("month", "2026-10-14")).toEqual({
      period: { from: "2026-10-01", to: "2026-10-31" },
      previous: { from: "2026-09-01", to: "2026-09-30" },
    });
    expect(resolvePeriod("month", "2026-01-15").previous).toEqual({ from: "2025-12-01", to: "2025-12-31" });
    expect(resolvePeriod("month", "2026-03-02").previous).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(resolvePeriod("month", "2028-03-02").previous).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("year is the whole calendar year and compares with the year before", () => {
    expect(resolvePeriod("year", "2026-10-14")).toEqual({
      period: { from: "2026-01-01", to: "2026-12-31" },
      previous: { from: "2025-01-01", to: "2025-12-31" },
    });
  });

  it("last30 and last90 end today and compare with the same number of days before", () => {
    expect(resolvePeriod("last30", "2026-10-14")).toEqual({
      period: { from: "2026-09-15", to: "2026-10-14" },
      previous: { from: "2026-08-16", to: "2026-09-14" },
    });
    const { period, previous } = resolvePeriod("last90", "2026-10-14");
    expect(period.to).toBe("2026-10-14");
    expect(addDays(period.from, 89)).toBe(period.to);
    expect(addDays(previous.from, 89)).toBe(previous.to);
    expect(addDays(previous.to, 1)).toBe(period.from);
  });

  it("lists the last months, oldest first, across a year end", () => {
    expect(monthKeys("2026-10-14", 6)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(monthKeys("2026-02-10", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
});
