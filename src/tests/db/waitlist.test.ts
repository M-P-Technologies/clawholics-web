// @vitest-environment node
// Integration test for the waitlist against a throwaway Postgres (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: async () => ({ users: { getUser: vi.fn(async () => null) } }),
}));

// Background work (the waitlist emails) runs right away and is awaited by the tests
const background: Promise<unknown>[] = [];
vi.mock("next/server", () => ({ after: (fn: () => Promise<unknown>) => background.push(fn()) }));

// The waitlist email is recorded instead of sent
const waitlistEmails: { email: string; date: string }[][] = [];
vi.mock("../../server/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../server/email")>();
  return { ...actual, sendWaitlistOpenedEmails: async (entries: { email: string; date: string }[]) => void waitlistEmails.push(entries) };
});

const as = (clerkId: string | null) => authMock.mockResolvedValue({ userId: clerkId });

// 10 June 2098, 09:30 in Manila: the days below are inside the default 30-day window
const NOW = new Date(Date.UTC(2098, 5, 10, 1, 30));
const FULL_DAY = "2098-06-17";
const FREE_DAY = "2098-06-18";

describe.skipIf(!TEST_DATABASE_URL)("the waitlist (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let booking: typeof import("../../server/handlers/booking");
  let waitlist: typeof import("../../server/handlers/waitlist");
  let serviceId: number;
  let artistId: number;
  const users: Record<string, number> = {};
  const appointments: Record<string, number> = {};

  const join = (clerk: string, body: object) => {
    as(clerk);
    return callRoute(waitlist.joinWaitlist, "/api/waitlist", { method: "POST", body });
  };
  const waitingFor = async (clerk: string) => {
    as(clerk);
    return (await callRoute(waitlist.getMyWaitlist, "/api/waitlist")).body as { id: number; appointment_date: string }[];
  };

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    db = await resetTestDatabase();
    await db`truncate users, scan_history restart identity cascade`;
    for (const key of ["booker1", "booker2", "wait1", "wait2", "wait3"]) {
      const [u] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values (${key}, ${`${key}@x.test`}, 'customer') returning id`;
      await db`insert into customer_profiles (user_id, first_name, last_name, phone, dob) values (${u.id}, ${key}, 'X', '0917', '2000-01-01')`;
      users[key] = u.id;
    }
    const [s] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Gel', 800, 500, 'tiered') returning id`;
    const [a] = await db<{ id: number }[]>`insert into nailists (name, category_id, display_order) values ('Anna', 1, 1) returning id`;
    serviceId = s.id;
    artistId = a.id;
    await db`insert into nailist_services (nailist_id, service_id) values (${artistId}, ${serviceId})`;
    await db`insert into nailist_time_slots (nailist_id, start_time, end_time) values (${artistId}, '10:00', '11:00'), (${artistId}, '11:00', '12:00')`;
    // The 17th is full: both of Anna's times are booked
    for (const [key, time] of [["booker1", "10:00-11:00"], ["booker2", "11:00-12:00"]]) {
      const [r] = await db<{ id: number }[]>`
        insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status)
        values (${users[key]}, ${serviceId}, 'Gel', ${artistId}, 'Anna', ${FULL_DAY}, ${time}, 'CONFIRMED') returning id`;
      appointments[key] = r.id;
    }
    booking = await import("../../server/handlers/booking");
    waitlist = await import("../../server/handlers/waitlist");
  });

  afterAll(async () => {
    vi.useRealTimers();
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("lets a client wait for a fully booked day, and joining twice is fine", async () => {
    const first = await join("wait1", { service_id: serviceId, nailist_id: artistId, date: FULL_DAY });
    expect(first.status).toBe(201);
    expect(first.body.already).toBe(false);
    const again = await join("wait1", { service_id: serviceId, nailist_id: artistId, date: FULL_DAY });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ already: true, id: first.body.id });
    expect((await join("wait2", { service_id: serviceId, nailist_id: null, date: FULL_DAY })).status).toBe(201);
    expect((await db`select id from waitlist_entries`)).toHaveLength(2);
  });

  it("refuses a day that has times free, and a day outside the booking window", async () => {
    const free = await join("wait3", { service_id: serviceId, nailist_id: artistId, date: FREE_DAY });
    expect(free.status).toBe(409);
    expect(free.body.code).toBe("NOT_FULL");
    const far = await join("wait3", { service_id: serviceId, date: "2098-09-17" });
    expect(far.status).toBe(400);
    expect(far.body.code).toBe("OUT_OF_WINDOW");
    const past = await join("wait3", { service_id: serviceId, date: "2098-06-01" });
    expect(past.status).toBe(400);
  });

  it("needs a signed-in client, a service and a day, and an artist who does the service", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await callRoute(waitlist.joinWaitlist, "/api/waitlist", { method: "POST", body: { service_id: serviceId, date: FULL_DAY } })).status).toBe(401);
    expect((await join("wait3", { date: FULL_DAY })).status).toBe(400);
    expect((await join("wait3", { service_id: serviceId, date: "17 June" })).status).toBe(400);
    expect((await join("wait3", { service_id: serviceId, nailist_id: 99999, date: FULL_DAY })).status).toBe(400);
  });

  it("shows a client their own waiting only, and lets them leave only their own", async () => {
    const mine = await waitingFor("wait1");
    expect(mine).toHaveLength(1);
    expect(mine[0].appointment_date).toBe(FULL_DAY);
    const theirs = (await waitingFor("wait2"))[0];

    as("wait1");
    expect((await callRoute(waitlist.leaveWaitlist, "/x", { method: "DELETE", params: { id: String(theirs.id) } })).status).toBe(404);
    expect((await db`select id from waitlist_entries`)).toHaveLength(2);
    expect((await callRoute(waitlist.leaveWaitlist, "/x", { method: "DELETE", params: { id: String(mine[0].id) } })).status).toBe(200);
    expect(await waitingFor("wait1")).toHaveLength(0);
    // Back on, for the release below
    expect((await join("wait1", { service_id: serviceId, nailist_id: artistId, date: FULL_DAY })).status).toBe(201);
  });

  it("limits how many days a client can wait for at once", async () => {
    for (let i = 0; i < 10; i++) {
      await db`insert into waitlist_entries (user_id, service_id, nailist_id, appointment_date) values (${users.wait3}, ${serviceId}, null, ${`2098-06-${20 + i}`})`;
    }
    const over = await join("wait3", { service_id: serviceId, nailist_id: artistId, date: FULL_DAY });
    expect(over.status).toBe(409);
    expect(over.body.code).toBe("WAITLIST_FULL");
    await db`delete from waitlist_entries where user_id = ${users.wait3}`;
  });

  it("tells the clients waiting when a booking is cancelled, once, and they're done", async () => {
    background.length = 0;
    as("booker1");
    const cancel = await callRoute(booking.refundAppointment, "/x", { method: "POST", params: { id: String(appointments.booker1) } });
    expect(cancel.status).toBe(200);
    await Promise.all(background);

    expect(waitlistEmails).toHaveLength(1);
    expect(waitlistEmails[0].map((e) => e.email).sort()).toEqual(["wait1@x.test", "wait2@x.test"]);
    expect(waitlistEmails[0].every((e) => e.date === FULL_DAY)).toBe(true);
    const left = await db<{ notified_at: string | null }[]>`select notified_at from waitlist_entries`;
    expect(left.every((entry) => entry.notified_at !== null)).toBe(true);
    // They're no longer waiting
    expect(await waitingFor("wait1")).toHaveLength(0);

    // Another release the same day tells nobody again
    background.length = 0;
    as("booker2");
    await callRoute(booking.refundAppointment, "/x", { method: "POST", params: { id: String(appointments.booker2) } });
    await Promise.all(background);
    expect(waitlistEmails).toHaveLength(1);
  });
});
