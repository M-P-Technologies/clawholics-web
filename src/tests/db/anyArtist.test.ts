// @vitest-environment node
// Integration test for "any available artist" against a throwaway Postgres (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: async () => ({ users: { getUser: vi.fn(async () => null) } }),
}));
vi.mock("next/server", () => ({ after: () => {} }));

const as = (clerkId: string | null) => authMock.mockResolvedValue({ userId: clerkId });

// 10 June 2098, 09:30 in Manila: bookings are for the 17th, inside the default 30-day window
const NOW = new Date(Date.UTC(2098, 5, 10, 1, 30));
const DAY = "2098-06-17";

describe.skipIf(!TEST_DATABASE_URL)("any available artist (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let booking: typeof import("../../server/handlers/booking");
  let serviceId: number;
  let artistA: number;
  let artistB: number;

  const book = (clerk: string, over: object = {}) => {
    as(clerk);
    return callRoute(booking.createBooking, "/api/booking/create", {
      method: "POST",
      body: { service_id: serviceId, appointment_date: DAY, appointment_time: "10:00-11:00", any_artist: true, ...over },
    });
  };
  const availability = async () => {
    const res = await callRoute(booking.getAnyAvailability, `/api/booking/any-availability?service_id=${serviceId}&from=${DAY}&to=${DAY}`);
    expect(res.status).toBe(200);
    return res.body.days as Record<string, string[]>;
  };

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    db = await resetTestDatabase();
    await db`truncate users, scan_history restart identity cascade`;
    for (const key of ["c1", "c2", "c3", "c4"]) {
      const [u] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values (${key}, ${`${key}@x.test`}, 'customer') returning id`;
      await db`insert into customer_profiles (user_id, first_name, last_name, phone, dob) values (${u.id}, ${key}, 'X', '0917', '2000-01-01')`;
    }
    const [s] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Gel', 800, 500, 'tiered') returning id`;
    serviceId = s.id;
    // Artist A comes first in the admin's order; both offer the service, with the same two times every day
    const [a] = await db<{ id: number }[]>`insert into nailists (name, category_id, display_order) values ('Anna', 1, 1) returning id`;
    const [b] = await db<{ id: number }[]>`insert into nailists (name, category_id, display_order) values ('Bea', 2, 2) returning id`;
    artistA = a.id;
    artistB = b.id;
    for (const id of [artistA, artistB]) {
      await db`insert into nailist_services (nailist_id, service_id) values (${id}, ${serviceId})`;
      await db`insert into nailist_time_slots (nailist_id, start_time, end_time) values (${id}, '10:00', '11:00'), (${id}, '11:00', '12:00')`;
    }
    booking = await import("../../server/handlers/booking");
  });

  afterAll(async () => {
    vi.useRealTimers();
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("offers a day's times when at least one artist has them free", async () => {
    expect(await availability()).toEqual({ [DAY]: ["10:00-11:00", "11:00-12:00"] });
  });

  it("books the time with a free artist and says who it is", async () => {
    const res = await book("c1");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "PENDING", nailist_id: artistA, nailist_name: "Anna", nailist_category_id: 1 });
    const [row] = await db<{ nailist_id: number; nailist_name: string }[]>`select nailist_id, nailist_name from appointments where id = ${res.body.appointment_id}`;
    expect(row).toEqual({ nailist_id: artistA, nailist_name: "Anna" });
  });

  it("gives the next booking at the same time to the other artist, whose day is lighter", async () => {
    const res = await book("c2");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nailist_id: artistB, nailist_name: "Bea", nailist_category_id: 2 });
    // Both are taken at 10:00 now, so the day offers only 11:00
    expect(await availability()).toEqual({ [DAY]: ["11:00-12:00"] });
  });

  it("refuses a time nobody has free, saying so", async () => {
    const res = await book("c3");
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: "SLOT_TAKEN", message: "No artist is free at this time. Please choose another time." });
  });

  it("still takes a named artist's own time as before, and refuses it when taken", async () => {
    const named = await book("c3", { any_artist: undefined, nailist_id: artistA, appointment_time: "11:00-12:00" });
    expect(named.status).toBe(200);
    expect(named.body).toMatchObject({ nailist_id: artistA });
    const taken = await book("c4", { any_artist: undefined, nailist_id: artistA, appointment_time: "11:00-12:00" });
    expect(taken.status).toBe(409);
    expect(taken.body).toMatchObject({ code: "SLOT_TAKEN", message: "Time slot already booked" });
  });

  it("still holds one unpaid booking per client, for any artist too", async () => {
    const again = await book("c1", { appointment_time: "11:00-12:00" });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("PENDING_APPOINTMENT_EXISTS");
  });

  it("applies the notice and the window like any booking", async () => {
    // 17 August is beyond the default 30 days from 10 June
    const far = await book("c4", { appointment_date: "2098-08-17" });
    expect(far.status).toBe(400);
    expect(far.body.code).toBe("TOO_FAR");
    // And a day beyond the window has no times to offer
    const res = await callRoute(booking.getAnyAvailability, `/api/booking/any-availability?service_id=${serviceId}&from=2098-08-17&to=2098-08-17`);
    expect(res.body.days).toEqual({});
  });

  it("needs a service that artists offer, and a valid range", async () => {
    const bad = await callRoute(booking.getAnyAvailability, "/api/booking/any-availability?service_id=x&from=2098-06-17&to=2098-06-17");
    expect(bad.status).toBe(400);
    const none = await book("c4", { service_id: 99999 });
    expect(none.status).toBe(400);
  });
});
