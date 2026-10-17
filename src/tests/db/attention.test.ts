// @vitest-environment node
// Integration tests for the dashboard's Needs attention queue against a throwaway Postgres (`npm run test:db`).
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
const NOW = new Date("2026-10-20T04:00:00Z"); // Tue 20 Oct 2026, 12:00 in Manila

type Item = { kind: string; appointment_id: number | null; user_id: number | null; client_name: string; since: string };

describe.skipIf(!TEST_DATABASE_URL)("the Needs attention queue (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let attention: typeof import("../../server/attention");
  const ids: Record<string, number> = {};

  beforeAll(async () => {
    db = await resetTestDatabase();
    await db`truncate users restart identity cascade`;
    await db`insert into users (clerk_id, email, role) values ('user_admin', 'admin@x.test', 'admin')`;
    const client = async (clerk: string, first: string, createdAt: string) => {
      const [u] = await db<{ id: number }[]>`insert into users (clerk_id, email, role, created_at) values (${clerk}, ${`${clerk}@x.test`}, 'customer', ${createdAt}) returning id`;
      await db`insert into customer_profiles (user_id, first_name, last_name) values (${u.id}, ${first}, 'X')`;
      return u.id;
    };
    const ana = await client("user_ana", "Ana", "2026-09-01 05:00:00");
    const bea = await client("user_bea", "Bea", "2026-09-01 05:00:00");
    ids.cara = await client("user_cara", "Cara", "2026-10-15 05:00:00"); // a warm lead: signed up, never booked
    const [svc] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Gel', 800, 500, 'tiered') returning id`;
    const [max] = await db<{ id: number }[]>`insert into nailists (name, category_id) values ('Maxine', 1) returning id`;
    const appt = async (key: string, user: number, date: string, time: string, status: string) => {
      const [r] = await db<{ id: number }[]>`
        insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status, created_at)
        values (${user}, ${svc.id}, 'Gel', ${max.id}, 'Maxine', ${date}, ${time}, ${status}, '2026-10-10 05:00:00') returning id`;
      ids[key] = r.id;
      return r.id;
    };
    const paid = (id: number, at: string) =>
      db`insert into payments (id, appointment_id, amount, status, payment_method, external_id, created_at) values (${crypto.randomUUID()}, ${id}, 500, 'PAID', 'QRPH', ${`x-${id}`}, ${at})`;

    // To confirm: paid two days ago without a screenshot, and paid yesterday with one (that one first)
    await paid(await appt("c1", ana, "2026-10-25", "13:00-15:00", "AWAITING_CONFIRMATION"), "2026-10-18 04:00:00");
    await paid(await appt("c2", bea, "2026-10-26", "13:00-15:00", "AWAITING_CONFIRMATION"), "2026-10-19 04:00:00");
    await db`insert into payment_proofs (appointment_id, user_id, image_url) values (${ids.c2}, ${bea}, 'x')`;
    // A payment proof to review on a booking paid by proof
    await appt("r1", ana, "2026-10-27", "13:00-15:00", "PENDING");
    await db`insert into payment_proofs (appointment_id, user_id, image_url, created_at) values (${ids.r1}, ${ana}, 'x', '2026-10-19 06:00:00')`;
    // Visits to complete: yesterday afternoon and this morning (the latest first); one before the cut-off isn't a to-do
    await appt("v1", ana, "2026-10-19", "13:00-15:00", "CONFIRMED");
    await appt("v2", bea, "2026-10-20", "09:00-10:00", "CONFIRMED");
    await appt("vOld", ana, "2026-10-10", "13:00-15:00", "CONFIRMED");
    // A completed visit whose photo is still to add
    await appt("p1", bea, "2026-10-17", "13:00-15:00", "COMPLETED");
    await db`insert into visit_completions (appointment_id, balance_amount, payment_method, nailist_id) values (${ids.p1}, 300, 'Cash', ${max.id})`;

    attention = await import("../../server/attention");
  });

  afterAll(async () => {
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("puts the five most urgent first: confirmations (with a screenshot first), proofs, then visits to complete (latest first)", async () => {
    const { items, counts } = await attention.listAttention("all", NOW);
    expect(items.map((i: Item) => [i.kind, i.appointment_id])).toEqual([
      ["confirm", ids.c2],
      ["confirm", ids.c1],
      ["review", ids.r1],
      ["complete", ids.v2],
      ["complete", ids.v1],
    ]);
    expect(counts).toEqual({ confirm: 2, review: 1, complete: 2, photos: 1, leads: 1 });
    expect(items[0]).toMatchObject({ client_name: "Bea X", service_name: "Gel", nailist_name: "Maxine", has_screenshot: true });
    // How long it has waited: since the payment for a confirmation, since the visit ended for one to complete
    expect(items[1].since).toBe("2026-10-18 04:00:00");
    expect(items[3].since).toBe("2026-10-20 02:00:00");
  });

  it("each tab has its own kinds: to confirm, to complete (with photos to add), and warm leads", async () => {
    expect((await attention.listAttention("confirm", NOW)).items.map((i: Item) => i.kind)).toEqual(["confirm", "confirm", "review"]);
    expect((await attention.listAttention("complete", NOW)).items.map((i: Item) => [i.kind, i.appointment_id])).toEqual([
      ["complete", ids.v2],
      ["complete", ids.v1],
      ["photos", ids.p1],
    ]);
    expect((await attention.listAttention("leads", NOW)).items).toEqual([
      expect.objectContaining({ kind: "lead", appointment_id: null, user_id: ids.cara, client_name: "Cara X", since: "2026-10-15 05:00:00" }),
    ]);
  });

  it("is admin only, and knows its tabs", async () => {
    const { getAttention } = await import("../../server/handlers/dashboard");
    as("user_ana");
    expect((await callRoute(getAttention, "/api/attention?tab=all")).status).toBe(403);
    as("user_admin");
    expect((await callRoute(getAttention, "/api/attention?tab=nope")).status).toBe(400);
    expect((await callRoute(getAttention, "/api/attention")).status).toBe(200);
  });
});
