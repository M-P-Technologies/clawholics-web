// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

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
vi.mock("../server/db", () => ({ getSql: () => sql }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { anyArtistCandidates, anyArtistDays } = await import("../server/anyArtist");

beforeEach(() => {
  queue.length = 0;
  sql.mockClear();
});

const artists = (...ids: number[]) => ids.map((id) => ({ id, name: `Artist ${id}` }));
const slot = (nailist_id: number, start_time: string, end_time: string) => ({ nailist_id, start_time, end_time });

describe("anyArtistCandidates", () => {
  it("tries the artist with the lightest day first, and keeps the admin's order among equals", async () => {
    queue.push(artists(1, 2, 3), [{ nailist_id: 1, n: 2 }, { nailist_id: 3, n: 1 }]);
    expect(await anyArtistCandidates(7, "2026-10-21")).toEqual([2, 3, 1]);
  });

  it("keeps the admin's order when nobody has a booking that day", async () => {
    queue.push(artists(5, 6, 7), []);
    expect(await anyArtistCandidates(7, "2026-10-21")).toEqual([5, 6, 7]);
  });

  it("doesn't count anything for one artist, and has none when no artist offers the service", async () => {
    queue.push(artists(4));
    expect(await anyArtistCandidates(7, "2026-10-21")).toEqual([4]);
    expect(sql).toHaveBeenCalledTimes(1);
    queue.push([]);
    expect(await anyArtistCandidates(8, "2026-10-21")).toEqual([]);
  });
});

describe("anyArtistDays", () => {
  // 2099-06-13 is a Saturday, 2099-06-15 a Monday
  const FAR_BEFORE = Date.UTC(2099, 5, 1);
  const monday = new Date("2099-06-15T00:00:00Z").getUTCDay();

  it("lists the times at least one artist has free: their hours, not on a day off, not taken", async () => {
    queue.push(
      artists(1, 2),
      [slot(1, "09:00", "11:00"), slot(1, "13:00", "15:00"), slot(2, "9:00", "11:00")], // hours (an older slot is written 9:00)
      [
        { nailist_id: 1, day_off_type: "REGULAR", day_of_week: monday, date: null }, // artist 1 never works Mondays
        { nailist_id: 2, day_off_type: "CUSTOM", day_of_week: null, date: "2099-06-16" }, // artist 2 is off on the 16th
      ],
      [
        { nailist_id: 1, appointment_date: "2099-06-14", appointment_time: "09:00-11:00" },
        { nailist_id: 2, appointment_date: "2099-06-14", appointment_time: "09:00-11:00" },
      ],
    );
    const { days } = await anyArtistDays(7, "2099-06-14", "2099-06-16", 0, FAR_BEFORE);
    // The 14th: both are taken at 09:00, only 1 has 13:00
    expect(days["2099-06-14"]).toEqual(["13:00-15:00"]);
    // The 15th (Monday): artist 1 is off, artist 2's 09:00 is free
    expect(days["2099-06-15"]).toEqual(["09:00-11:00"]);
    // The 16th: artist 2 is off, artist 1 has both
    expect(days["2099-06-16"]).toEqual(["09:00-11:00", "13:00-15:00"]);
  });

  it("joins the times of artists with different hours, once each", async () => {
    queue.push(artists(1, 2), [slot(1, "09:00", "11:00"), slot(2, "09:00", "11:00"), slot(2, "11:00", "13:00")], [], []);
    expect((await anyArtistDays(7, "2099-06-14", "2099-06-14", 0, FAR_BEFORE)).days["2099-06-14"]).toEqual(["09:00-11:00", "11:00-13:00"]);
  });

  it("leaves out a day with nothing free, and a time sooner than the notice", async () => {
    queue.push(artists(1), [slot(1, "09:00", "11:00"), slot(1, "15:00", "17:00")], [], [{ nailist_id: 1, appointment_date: "2099-06-15", appointment_time: "09:00-11:00" }]);
    // 09:00 in Manila on the 14th, with 4 hours' notice: the morning is too soon, the afternoon isn't
    const now = Date.UTC(2099, 5, 14, 1, 0);
    const { days } = await anyArtistDays(7, "2099-06-14", "2099-06-15", 4, now);
    expect(days["2099-06-14"]).toEqual(["15:00-17:00"]);
    // The 15th: the morning is taken, the afternoon is free
    expect(days["2099-06-15"]).toEqual(["15:00-17:00"]);
  });

  it("lists a day as full when someone works but every time is taken, not a day off or a day gone by", async () => {
    queue.push(
      artists(1),
      [slot(1, "09:00", "11:00")],
      [{ nailist_id: 1, day_off_type: "CUSTOM", day_of_week: null, date: "2099-06-16" }],
      [{ nailist_id: 1, appointment_date: "2099-06-14", appointment_time: "09:00-11:00" }, { nailist_id: 1, appointment_date: "2099-06-13", appointment_time: "09:00-11:00" }],
    );
    // 09:30 Manila on the 13th: the 13th's only time has already started (not a day to wait for), the 14th is full, the 15th is free, the 16th is a day off
    const now = Date.UTC(2099, 5, 13, 1, 30);
    const result = await anyArtistDays(7, "2099-06-13", "2099-06-16", 0, now);
    expect(result.full).toEqual(["2099-06-14"]);
    expect(Object.keys(result.days)).toEqual(["2099-06-15"]);
  });

  it("can be limited to one artist, whose times alone count", async () => {
    queue.push(artists(1, 2), [slot(1, "09:00", "11:00"), slot(2, "13:00", "15:00")], [], []);
    expect((await anyArtistDays(7, "2099-06-14", "2099-06-14", 0, FAR_BEFORE, 2)).days["2099-06-14"]).toEqual(["13:00-15:00"]);
    queue.push(artists(1, 2));
    expect(await anyArtistDays(7, "2099-06-14", "2099-06-14", 0, FAR_BEFORE, 9)).toEqual({ days: {}, full: [] });
  });

  it("has no days when no artist offers the service, or the range is backwards", async () => {
    queue.push([]);
    expect(await anyArtistDays(8, "2099-06-14", "2099-06-16", 0, FAR_BEFORE)).toEqual({ days: {}, full: [] });
    queue.push(artists(1));
    expect(await anyArtistDays(7, "2099-06-16", "2099-06-14", 0, FAR_BEFORE)).toEqual({ days: {}, full: [] });
  });
});
