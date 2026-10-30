// @vitest-environment node
// Integration test for the admin list's paid-only filter against a throwaway Postgres (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: async () => ({ users: { getUser: vi.fn(async () => null) } }),
}));
vi.mock("next/server", () => ({ after: () => {} }));

describe.skipIf(!TEST_DATABASE_URL)("the cancelled list (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  const ids: Record<string, number> = {};

  beforeAll(async () => {
    db = await resetTestDatabase();
    await db`truncate users, scan_history restart identity cascade`;
    await db`insert into users (clerk_id, email, role) values ('user_admin', 'admin@x.test', 'admin')`;
    const [u] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('user_a', 'a@x.test', 'customer') returning id`;
    await db`insert into customer_profiles (user_id, first_name, last_name) values (${u.id}, 'Ana', 'A')`;
    const [s] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Gel', 800, 500, 'tiered') returning id`;
    const [n] = await db<{ id: number }[]>`insert into nailists (name, category_id) values ('Maxine', 1) returning id`;

    // Three cancelled bookings on different days: one paid (then cancelled), one whose hold ran out
    // (its payment failed) and one that never had a payment; plus a confirmed one with a payment
    const appt = async (key: string, day: string, status: string, payment: string | null) => {
      const [r] = await db<{ id: number }[]>`
        insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status)
        values (${u.id}, ${s.id}, 'Gel', ${n.id}, 'Maxine', ${day}, '10:00-11:00', ${status}) returning id`;
      ids[key] = r.id;
      if (payment) {
        await db`insert into payments (id, appointment_id, amount, status, payment_method, external_id) values (${`p-${key}`}, ${r.id}, 500, ${payment}, 'QRPH', ${`x-${key}`})`;
      }
    };
    await appt("paid", "2099-01-01", "CANCELLED", "PAID");
    await appt("expired", "2099-01-02", "CANCELLED", "FAILED");
    await appt("never", "2099-01-03", "CANCELLED", null);
    await appt("confirmed", "2099-01-04", "CONFIRMED", "PAID");
  });

  afterAll(async () => {
    await db?.end();
  });

  const list = async (query: string) => {
    authMock.mockResolvedValue({ userId: "user_admin" });
    const booking = await import("../../server/handlers/booking");
    const res = await callRoute(booking.listAllAppointments, `/api/booking/appointments?page=1&pageSize=50&${query}`);
    expect(res.status).toBe(200);
    return res.body as { rows: { id: number }[]; total: number };
  };

  it("lists every cancelled booking by default", async () => {
    const result = await list("status=CANCELLED");
    expect(result.rows.map((r) => r.id).sort()).toEqual([ids.paid, ids.expired, ids.never].sort());
    expect(result.total).toBe(3);
  });

  it("with paid=1 lists only the ones that were ever paid, and counts them the same", async () => {
    const result = await list("status=CANCELLED&paid=1");
    expect(result.rows.map((r) => r.id)).toEqual([ids.paid]);
    expect(result.total).toBe(1);
  });

  it("paid=1 doesn't narrow a status that isn't being filtered to cancelled ones", async () => {
    const result = await list("status=CONFIRMED&paid=1");
    expect(result.rows.map((r) => r.id)).toEqual([ids.confirmed]);
  });
});
