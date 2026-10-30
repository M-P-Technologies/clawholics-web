// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("../server/db", () => ({ getSql: () => vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { checkSlot } = await import("../server/slotRules");

// 2026-10-20 09:30 in Manila (UTC+8)
const now = new Date(Date.UTC(2026, 9, 20, 1, 30));

describe("checkSlot: notice", () => {
  it("refuses a time that starts within the notice, and says how much notice is needed", async () => {
    const result = await checkSlot({ nailistId: 1, date: "2026-10-20", time: "10:00-12:00", minNoticeHours: 2, now });
    expect(result).toMatchObject({ ok: false, status: 400, code: "TOO_SOON" });
    expect(result.ok === false && result.message).toBe("Bookings need at least 2 hours' notice. Please choose a later time.");
  });

  it("says '1 hour's notice' for one hour", async () => {
    const result = await checkSlot({ nailistId: 1, date: "2026-10-20", time: "10:00-12:00", minNoticeHours: 1, now });
    expect(result.ok === false && result.message).toMatch(/1 hour's notice/);
  });

  it("refuses a date beyond the booking window, and says how far ahead bookings open", async () => {
    const result = await checkSlot({ nailistId: 1, date: "2026-11-20", time: "10:00-12:00", maxAdvanceDays: 30, now });
    expect(result).toMatchObject({ ok: false, status: 400, code: "TOO_FAR" });
    expect(result.ok === false && result.message).toBe("Bookings open up to 30 days ahead. Please choose an earlier date.");
  });

  it("counts the window from today in Manila, so its last day is still open", async () => {
    // 19 Nov is 30 days after 20 Oct: it passes this rule and goes on to the database checks (not mocked here)
    const result = await checkSlot({ nailistId: 1, date: "2026-11-19", time: "10:00-12:00", maxAdvanceDays: 30, now }).catch((error) => error);
    expect(result).not.toMatchObject({ code: "TOO_FAR" });
  });

  it("still refuses a time that has started when no notice is needed", async () => {
    const result = await checkSlot({ nailistId: 1, date: "2026-10-20", time: "09:00-10:00", minNoticeHours: 0, now });
    expect(result).toMatchObject({ ok: false, code: "SLOT_PAST" });
  });
});
