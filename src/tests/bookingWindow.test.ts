import { describe, expect, it } from "vitest";
import { addDays, daysLabel, isBeyondWindow, lastBookableDay, monthsAheadFor } from "@/lib/bookingWindow";

// 20 Oct 2026, 09:30 in Manila (UTC+8)
const NOW = Date.UTC(2026, 9, 20, 1, 30);

describe("addDays", () => {
  it("adds days across months and years", () => {
    expect(addDays("2026-10-20", 30)).toBe("2026-11-19");
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
    expect(addDays("2028-02-27", 2)).toBe("2028-02-29");
  });
});

describe("the booking window", () => {
  it("ends the given number of days after today in Manila", () => {
    expect(lastBookableDay(30, NOW)).toBe("2026-11-19");
    // 17:00 UTC on the 20th is already the 21st in Manila
    expect(lastBookableDay(30, Date.UTC(2026, 9, 20, 17, 0))).toBe("2026-11-20");
  });

  it("includes the last day and refuses the day after", () => {
    expect(isBeyondWindow("2026-11-19", 30, NOW)).toBe(false);
    expect(isBeyondWindow("2026-11-20", 30, NOW)).toBe(true);
    expect(isBeyondWindow("2026-10-20", 30, NOW)).toBe(false);
  });
});

describe("monthsAheadFor", () => {
  it("is how many months after this one the last bookable day falls in", () => {
    expect(monthsAheadFor(30, NOW)).toBe(1); // 19 Nov
    expect(monthsAheadFor(7, NOW)).toBe(0); // 27 Oct: still this month
    expect(monthsAheadFor(90, NOW)).toBe(3); // 18 Jan 2027
    expect(monthsAheadFor(365, NOW)).toBe(12); // 20 Oct 2027
  });
});

describe("daysLabel", () => {
  it("says '1 day' and 'N days'", () => {
    expect(daysLabel(1)).toBe("1 day");
    expect(daysLabel(30)).toBe("30 days");
  });
});
