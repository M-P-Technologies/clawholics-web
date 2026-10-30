// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A fake database: each query (a tagged template) answers with the next prepared result; the
// helpers (sql(list), sql.unsafe) don't consume one.
const queue: unknown[][] = [];
const sql = Object.assign(
  vi.fn((...args: unknown[]) => {
    const first = args[0] as unknown[] & { raw?: unknown };
    if (Array.isArray(first) && !("raw" in first)) return first; // sql(list)
    return Promise.resolve(queue.shift() ?? []);
  }),
  { unsafe: (text: string) => text },
);
const anyArtistDays = vi.fn();
const sendWaitlistOpenedEmails = vi.fn();
vi.mock("../server/db", () => ({ getSql: () => sql }));
vi.mock("../server/anyArtist", () => ({ anyArtistDays: (...args: unknown[]) => anyArtistDays(...args) }));
vi.mock("../server/bookingNotice", () => ({ getBookingMinNoticeHours: async () => 2 }));
vi.mock("../server/email", () => ({ sendWaitlistOpenedEmails: (...args: unknown[]) => sendWaitlistOpenedEmails(...args) }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { dayHasFreeTime, notifyWaitlist, notifyWaitlistSafely } = await import("../server/waitlist");

// 20 Oct 2026, 09:30 in Manila
const NOW = Date.UTC(2026, 9, 20, 1, 30);
const DAY = "2026-10-22";

const waiting = (id: number, over: object = {}) => ({
  id, email: `c${id}@x.test`, first_name: "Ana", service_id: 4, service_name: "Gel", nailist_id: null, nailist_name: null, ...over,
});

beforeEach(() => {
  queue.length = 0;
  sql.mockClear();
  anyArtistDays.mockReset();
  sendWaitlistOpenedEmails.mockReset().mockResolvedValue(undefined);
  anyArtistDays.mockResolvedValue({ days: { [DAY]: ["10:00-11:00"] }, full: [] });
});
afterEach(() => vi.restoreAllMocks());

describe("dayHasFreeTime", () => {
  it("asks for that day alone, with the notice, limited to the artist when one is named", async () => {
    expect(await dayHasFreeTime(4, DAY, 7, NOW)).toBe(true);
    expect(anyArtistDays).toHaveBeenCalledWith(4, DAY, DAY, 2, NOW, 7);
    await dayHasFreeTime(4, DAY, null, NOW);
    expect(anyArtistDays).toHaveBeenLastCalledWith(4, DAY, DAY, 2, NOW, undefined);
  });

  it("is false when nothing is free that day", async () => {
    anyArtistDays.mockResolvedValue({ days: {}, full: [DAY] });
    expect(await dayHasFreeTime(4, DAY, null, NOW)).toBe(false);
  });
});

describe("notifyWaitlist", () => {
  it("emails each client waiting for the day, once, and says when", async () => {
    queue.push([waiting(1), waiting(2, { nailist_id: 7, nailist_name: "Maxine" })], [{ id: 1 }, { id: 2 }]);
    const result = await notifyWaitlist(7, DAY, NOW);
    expect(result).toEqual({ waiting: 2, notified: 2 });
    expect(sendWaitlistOpenedEmails).toHaveBeenCalledTimes(1);
    const sent = sendWaitlistOpenedEmails.mock.calls[0][0] as { email: string; date: string; nailist_name: string | null }[];
    expect(sent.map((s) => s.email)).toEqual(["c1@x.test", "c2@x.test"]);
    expect(sent.every((s) => s.date === DAY)).toBe(true);
    expect(sent[1].nailist_name).toBe("Maxine");
  });

  it("checks each service and artist once, and tells only those whose day has a time", async () => {
    // Two waiting for any artist for service 4, one for artist 7 and service 5 (nothing free there)
    queue.push([waiting(1), waiting(2), waiting(3, { service_id: 5, nailist_id: 7 })], [{ id: 1 }, { id: 2 }]);
    anyArtistDays.mockImplementation(async (service: number) => (service === 4 ? { days: { [DAY]: ["10:00-11:00"] }, full: [] } : { days: {}, full: [DAY] }));
    const result = await notifyWaitlist(7, DAY, NOW);
    expect(anyArtistDays).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ waiting: 3, notified: 2 });
    expect((sendWaitlistOpenedEmails.mock.calls[0][0] as { email: string }[]).map((s) => s.email)).toEqual(["c1@x.test", "c2@x.test"]);
  });

  it("tells nobody when the released slot left no time free, and keeps them waiting", async () => {
    queue.push([waiting(1)]);
    anyArtistDays.mockResolvedValue({ days: {}, full: [DAY] });
    expect(await notifyWaitlist(7, DAY, NOW)).toEqual({ waiting: 1, notified: 0 });
    expect(sendWaitlistOpenedEmails).not.toHaveBeenCalled();
    // Only the one query: no entry was taken
    expect(sql.mock.calls.map((call) => (call[0] as unknown as string[]).join(" ")).filter((q) => q.includes("update waitlist_entries"))).toHaveLength(0);
  });

  it("emails only the entries this run took, not ones a run at the same time took", async () => {
    queue.push([waiting(1), waiting(2)], [{ id: 2 }]);
    expect(await notifyWaitlist(7, DAY, NOW)).toEqual({ waiting: 2, notified: 1 });
    expect((sendWaitlistOpenedEmails.mock.calls[0][0] as { email: string }[]).map((s) => s.email)).toEqual(["c2@x.test"]);
  });

  it("puts the entries back when Resend refuses, so the next release tries again", async () => {
    queue.push([waiting(1)], [{ id: 1 }]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    sendWaitlistOpenedEmails.mockRejectedValue(new Error("quota"));
    expect(await notifyWaitlist(7, DAY, NOW)).toEqual({ waiting: 1, notified: 0 });
    // The last query is the one that puts them back (notified_at = null)
    const queries = sql.mock.calls.map((call) => (call[0] as unknown as string[]).join(" "));
    expect(queries.filter((q) => q.includes("notified_at = null"))).toHaveLength(1);
    expect(queries.filter((q) => q.includes("notified_at = clawholics_utc_now()"))).toHaveLength(1);
  });

  it("does nothing for a day gone by, or when nobody is waiting", async () => {
    expect(await notifyWaitlist(7, "2026-10-19", NOW)).toEqual({ waiting: 0, notified: 0 });
    expect(sql).not.toHaveBeenCalled();
    queue.push([]);
    expect(await notifyWaitlist(7, DAY, NOW)).toEqual({ waiting: 0, notified: 0 });
    expect(anyArtistDays).not.toHaveBeenCalled();
  });
});

describe("notifyWaitlistSafely", () => {
  it("never throws into the request that released the slot", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    sql.mockImplementationOnce(() => Promise.reject(new Error("down")));
    await expect(notifyWaitlistSafely(7, DAY)).resolves.toBeUndefined();
  });

  it("ignores a slot with no artist or day", async () => {
    await notifyWaitlistSafely(null, DAY);
    await notifyWaitlistSafely(7, undefined);
    expect(sql).not.toHaveBeenCalled();
  });
});
