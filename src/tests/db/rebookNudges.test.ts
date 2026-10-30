// @vitest-environment node
// Integration test for the rebooking emails against a throwaway Postgres (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }), clerkClient: async () => ({ users: { getUser: vi.fn(async () => null) } }) }));
vi.mock("next/server", () => ({ after: () => {} }));

// 09:00 on 14 June 2098 in Manila. With the nudge set to 14 days, visits on 31 May are due, and the
// week before (24-30 May) is caught up if a run was missed
const RUN = new Date(Date.UTC(2098, 5, 14, 1, 0));
const DUE = "2098-05-31";

describe.skipIf(!TEST_DATABASE_URL)("rebooking emails (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let nudges: typeof import("../../server/rebookNudges");
  let unsubscribe: typeof import("../../server/handlers/unsubscribe");
  let unsub: typeof import("../../server/unsubscribe");
  const ids: Record<string, number> = {};
  const users: Record<string, number> = {};
  const sent: { to: string; headers?: Record<string, string> }[][] = [];

  const nudged = async (key: string) => (await db<{ rebook_nudge_sent_at: string | null }[]>`select rebook_nudge_sent_at from appointments where id = ${ids[key]}`)[0].rebook_nudge_sent_at;

  beforeAll(async () => {
    db = await resetTestDatabase();
    process.env.RESEND_API_KEY = "re_test";
    process.env.CRON_SECRET = "test-secret";
    await db`truncate users, scan_history restart identity cascade`;

    const client = async (key: string, role = "customer", off = 0) => {
      const [u] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values (${key}, ${`${key}@x.test`}, ${role}) returning id`;
      await db`insert into customer_profiles (user_id, first_name, last_name, nudge_emails_off) values (${u.id}, ${key}, 'X', ${off})`;
      users[key] = u.id;
      return u.id;
    };
    const ana = await client("ana");
    const bea = await client("bea");
    const cara = await client("cara", "customer", 1); // unsubscribed
    const dina = await client("dina"); // booked again
    const eve = await client("eve"); // no Complete visit record
    const fay = await client("fay"); // visit too recent
    const gia = await client("gia"); // visit older than the catch-up week
    const admin = await client("boss", "admin");
    const [guest] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('walkin_guest', 'walkin-guest@clawholics.local', 'customer') returning id`;
    await db`insert into customer_profiles (user_id, first_name, last_name) values (${guest.id}, 'Walk', 'In')`;

    const [s] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Gel', 800, 500, 'tiered') returning id`;
    const [n] = await db<{ id: number }[]>`insert into nailists (name, category_id) values ('Maxine', 1) returning id`;
    let hour = 8;
    const appt = async (key: string, user: number, date: string, status: string, completed = true) => {
      const time = `${String(hour).padStart(2, "0")}:00-${String(hour + 1).padStart(2, "0")}:00`;
      hour = hour >= 20 ? 8 : hour + 1;
      const [r] = await db<{ id: number }[]>`
        insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status)
        values (${user}, ${s.id}, 'Gel', ${n.id}, 'Maxine', ${date}, ${time}, ${status}) returning id`;
      ids[key] = r.id;
      if (completed && status === "COMPLETED") {
        await db`insert into visit_completions (appointment_id, balance_amount, payment_method, nailist_id) values (${r.id}, 400, 'Cash', ${n.id})`;
      }
    };
    await appt("ana", ana, DUE, "COMPLETED"); // due
    await appt("bea", bea, "2098-05-27", "COMPLETED"); // due, a missed run's catch-up
    await appt("cara", cara, DUE, "COMPLETED");
    await appt("dina", dina, DUE, "COMPLETED");
    await appt("dinaAgain", dina, "2098-06-20", "CONFIRMED"); // booked again
    await appt("eve", eve, DUE, "COMPLETED", false);
    await appt("fay", fay, "2098-06-01", "COMPLETED"); // 13 days ago
    await appt("gia", gia, "2098-05-20", "COMPLETED"); // 25 days ago
    await appt("boss", admin, DUE, "COMPLETED");
    await appt("guest", guest.id, DUE, "COMPLETED");

    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("api.resend.com")) {
        sent.push(JSON.parse(String(init?.body)));
        return Response.json({ data: [] });
      }
      return Response.json({});
    }));
    nudges = await import("../../server/rebookNudges");
    unsubscribe = await import("../../server/handlers/unsubscribe");
    unsub = await import("../../server/unsubscribe");
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("does nothing until the salon sets a number of days", async () => {
    expect(await nudges.sendRebookNudges(RUN)).toEqual({ enabled: false, due: 0, emailed: 0 });
    expect(sent).toHaveLength(0);
  });

  it("emails a client whose finished visit is due and who hasn't booked since, once", async () => {
    await db`insert into site_settings (key, value) values ('rebook_nudge_days', '14') on conflict (key) do update set value = '14'`;
    const result = await nudges.sendRebookNudges(RUN);
    expect(result).toEqual({ enabled: true, due: 2, emailed: 2 });
    expect(sent).toHaveLength(1);
    expect(sent[0].map((e) => e.to).sort()).toEqual(["ana@x.test", "bea@x.test"]);
    // Each has its own unsubscribe link
    expect(sent[0].find((e) => e.to === "ana@x.test")!.headers!["List-Unsubscribe"]).toContain(`u=${users.ana}`);
    expect(await nudged("ana")).not.toBeNull();
    expect(await nudged("bea")).not.toBeNull();
    // Not them: unsubscribed, booked again, no Complete visit record, too recent, too old, an admin, the walk-in guest
    for (const key of ["cara", "dina", "eve", "fay", "gia", "boss", "guest"]) expect(await nudged(key)).toBeNull();
  });

  it("sends nothing more when it runs again", async () => {
    const before = sent.length;
    expect(await nudges.sendRebookNudges(RUN)).toEqual({ enabled: true, due: 0, emailed: 0 });
    expect(sent).toHaveLength(before);
  });

  it("puts the visits back for the next run when Resend refuses the batch", async () => {
    await db`update appointments set rebook_nudge_sent_at = null`;
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "quota" }, { status: 429 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await nudges.sendRebookNudges(RUN)).toMatchObject({ due: 2, emailed: 0 });
    expect(await nudged("ana")).toBeNull();
  });

  it("unsubscribing turns the emails off for that client only, and a forged link does nothing", async () => {
    await db`update appointments set rebook_nudge_sent_at = null`;
    const link = new URL(unsub.unsubscribeUrl(users.ana)!);
    const off = async () => (await db<{ nudge_emails_off: number }[]>`select nudge_emails_off from customer_profiles where user_id = ${users.ana}`)[0].nudge_emails_off;

    const forged = await callRoute(unsubscribe.unsubscribeNudges, `/api/unsubscribe?u=${users.ana}&t=${"0".repeat(64)}`);
    expect(forged.status).toBe(400);
    expect(await off()).toBe(0);

    const ok = await callRoute(unsubscribe.unsubscribeNudges, `${link.pathname}${link.search}`);
    expect(ok.status).toBe(200);
    expect(await off()).toBe(1);
    // Repeating it is fine, and the other client is untouched
    expect((await callRoute(unsubscribe.unsubscribeNudges, `${link.pathname}${link.search}`, { method: "POST" })).status).toBe(200);
    expect((await db<{ nudge_emails_off: number }[]>`select nudge_emails_off from customer_profiles where user_id = ${users.bea}`)[0].nudge_emails_off).toBe(0);

    // Unsubscribed, ana is no longer nudged
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("api.resend.com")) sent.push(JSON.parse(String(init?.body)));
      return Response.json({ data: [] });
    }));
    const before = sent.length;
    expect(await nudges.sendRebookNudges(RUN)).toMatchObject({ due: 1, emailed: 1 });
    expect(sent[before].map((e) => e.to)).toEqual(["bea@x.test"]);
  });
});
