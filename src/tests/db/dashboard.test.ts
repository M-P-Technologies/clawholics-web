// @vitest-environment node
// Integration tests for the dashboard numbers against a throwaway Postgres (`npm run test:db`).
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
const NOW = new Date("2026-10-14T02:00:00Z"); // Wed 14 Oct 2026, 10:00 in Manila

describe.skipIf(!TEST_DATABASE_URL)("dashboard (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let dashboard: typeof import("../../server/dashboard");
  let handlers: typeof import("../../server/handlers/dashboard");
  let utilization: typeof import("../../server/utilization");

  beforeAll(async () => {
    db = await resetTestDatabase();
    // A clean slate: the dev seed's people and appointments must not leak into the numbers
    await db`truncate users, scan_history restart identity cascade`;

    await db`insert into users (clerk_id, email, role) values ('user_admin', 'admin@x.test', 'admin')`;
    const client = async (clerk: string, first: string, createdAt: string) => {
      const [u] = await db<{ id: number }[]>`
        insert into users (clerk_id, email, role, created_at) values (${clerk}, ${`${clerk}@x.test`}, 'customer', ${createdAt}) returning id`;
      await db`insert into customer_profiles (user_id, first_name, last_name) values (${u.id}, ${first}, ${first.charAt(0)})`;
      return u.id;
    };
    const A = await client("user_a", "Ana", "2026-10-03 05:00:00");
    const B = await client("user_b", "Bea", "2026-09-30 17:00:00"); // 01:00 on 1 Oct in Manila
    const C = await client("user_c", "Cara", "2026-09-10 05:00:00");
    const D = await client("user_d", "Dana", "2026-08-01 05:00:00");
    const E = await client("user_e", "Eve", "2026-05-01 05:00:00");
    const [guest] = await db<{ id: number }[]>`
      insert into users (clerk_id, email, role, created_at) values ('walkin_guest', 'walkin-guest@clawholics.local', 'customer', '2026-10-05 05:00:00') returning id`;

    const [s1] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Gel Manicure', 800, 500, 'tiered') returning id`;
    const [s2] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Soft Gel Extensions', 1500, 1200, 'tiered') returning id`;
    const [s3] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Nail Art', 300, 300, 'single') returning id`;
    const [n1] = await db<{ id: number }[]>`insert into nailists (name, category_id) values ('Maxine', 1) returning id`; // Master Technician
    const [n2] = await db<{ id: number }[]>`insert into nailists (name, category_id) values ('Jun', 2) returning id`; // Junior Technician
    const S1 = { id: s1.id, name: "Gel Manicure" }, S2 = { id: s2.id, name: "Soft Gel Extensions" }, S3 = { id: s3.id, name: "Nail Art" };
    const N1 = { id: n1.id, name: "Maxine" }, N2 = { id: n2.id, name: "Jun" };

    type Spec = { date: string; time: string; status: string; user: number; s: { id: number; name: string }; n: { id: number; name: string }; created: string; walkin?: [string, string] };
    const appt = async (o: Spec) => {
      const [r] = await db<{ id: number }[]>`
        insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status, created_at, walkin_first_name, walkin_last_name)
        values (${o.user}, ${o.s.id}, ${o.s.name}, ${o.n.id}, ${o.n.name}, ${o.date}, ${o.time}, ${o.status}, ${o.created}, ${o.walkin?.[0] ?? null}, ${o.walkin?.[1] ?? null})
        returning id`;
      return r.id;
    };
    // October (the period)
    const a1 = await appt({ date: "2026-10-01", time: "10:00-11:00", status: "COMPLETED", user: A, s: S1, n: N1, created: "2026-09-28 05:00:00" }); // 800
    const a2 = await appt({ date: "2026-10-02", time: "10:00-11:00", status: "COMPLETED", user: B, s: S1, n: N2, created: "2026-09-29 05:00:00" }); // 500
    const a3 = await appt({ date: "2026-10-06", time: "10:00-11:00", status: "COMPLETED", user: A, s: S2, n: N1, created: "2026-09-29 06:00:00" }); // 1500
    const a4 = await appt({ date: "2026-10-08", time: "10:00-11:00", status: "COMPLETED", user: C, s: S3, n: N2, created: "2026-09-30 05:00:00" }); // 300
    const a5 = await appt({ date: "2026-10-09", time: "10:00-11:00", status: "CANCELLED", user: B, s: S1, n: N2, created: "2026-10-02 05:00:00" });
    await appt({ date: "2026-10-10", time: "10:00-11:00", status: "REFUNDED", user: D, s: S2, n: N1, created: "2026-10-02 06:00:00" });
    const a8 = await appt({ date: "2026-10-14", time: "15:00-16:00", status: "CONFIRMED", user: D, s: S1, n: N1, created: "2026-10-12 08:00:00" });
    await appt({ date: "2026-10-14", time: "09:00-10:00", status: "CONFIRMED", user: A, s: S2, n: N2, created: "2026-10-13 08:00:00" });
    await appt({ date: "2026-10-20", time: "10:00-11:00", status: "CONFIRMED", user: guest.id, s: S3, n: N2, created: "2026-10-13 09:00:00", walkin: ["Walk", "In"] });
    const a11 = await appt({ date: "2026-10-21", time: "10:00-11:00", status: "PENDING", user: B, s: S1, n: N1, created: "2026-10-13 10:00:00" });
    const a12 = await appt({ date: "2026-10-22", time: "10:00-11:00", status: "AWAITING_PROOF", user: C, s: S1, n: N2, created: "2026-10-13 11:00:00" });
    // September (the previous period) and earlier
    const a7 = await appt({ date: "2026-09-15", time: "10:00-11:00", status: "COMPLETED", user: C, s: S1, n: N2, created: "2026-09-01 05:00:00" }); // 500
    const a13 = await appt({ date: "2026-09-20", time: "10:00-11:00", status: "COMPLETED", user: D, s: S2, n: N2, created: "2026-09-05 05:00:00" }); // 1200
    // its service was deleted from the catalog: no price, still a booking
    await appt({ date: "2026-09-10", time: "13:00-14:00", status: "COMPLETED", user: D, s: { id: 999999, name: "Retired Service" }, n: N2, created: "2026-08-30 05:00:00" });
    await appt({ date: "2026-06-01", time: "10:00-11:00", status: "COMPLETED", user: E, s: S1, n: N1, created: "2026-05-20 05:00:00" });

    const pay = (appointment: number, status: string, createdAt: string, ref: string) =>
      db`insert into payments (id, appointment_id, amount, status, payment_method, external_id, created_at)
         values (${crypto.randomUUID()}, ${appointment}, 500, ${status}, 'MANUAL', ${ref}, ${createdAt})`;
    await pay(a1, "PAID", "2026-10-01 03:00:00", "p1");
    await pay(a2, "PAID", "2026-09-30 17:00:00", "p2"); // 01:00 on 1 Oct in Manila: October
    await pay(a3, "PAID", "2026-10-03 04:00:00", "p3");
    await pay(a8, "PENDING", "2026-10-12 08:00:00", "p4");
    await pay(a5, "PAID", "2026-10-02 05:00:00", "p5");
    await pay(a7, "PAID", "2026-09-14 05:00:00", "p6");
    await pay(a13, "PAID", "2026-09-20 05:00:00", "p7");
    await pay(a4, "PAID", "2026-10-31 16:30:00", "p8"); // 00:30 on 1 Nov in Manila: November
    // a3 was completed with its balance recorded: 1,200 at the salon (so it sold for 500 + 1,200),
    // the next morning (7 Oct in Manila), which is the day the Bookings card counts it
    await db`insert into visit_completions (appointment_id, balance_amount, payment_method, nailist_id, created_at) values (${a3}, 1200, 'GCash', ${N1.id}, '2026-10-07 02:00:00')`;
    // Completed with the booking tracker's Complete visit too (balances as their list price less the
    // downpayment, so they sell for the same; photos added). a4 and the September and June visits by
    // the retired service and Eve were marked completed without it, so the two client cards skip them.
    await db`insert into visit_completions (appointment_id, balance_amount, payment_method, nailist_id, photos_added, created_at) values
      (${a1}, 300, 'Cash', ${N1.id}, 1, '2026-10-01 05:00:00'), (${a2}, 0, 'Cash', ${N2.id}, 1, '2026-10-02 05:00:00'),
      (${a7}, 0, 'Cash', ${N2.id}, 1, '2026-09-15 05:00:00'), (${a13}, 700, 'Cash', ${N2.id}, 1, '2026-09-20 05:00:00')`;

    const scan = (action: string, createdAt: string) =>
      db`insert into scan_history (admin_clerk_id, client_clerk_id, action, created_at) values ('user_admin', 'user_a', ${action}, ${createdAt})`;
    await scan("stamp", "2026-10-02 05:00:00");
    await scan("stamp", "2026-10-05 05:00:00");
    await scan("stamp", "2026-10-09 05:00:00");
    await scan("redeem", "2026-10-06 05:00:00");
    await scan("stamp", "2026-09-20 05:00:00");

    await db`insert into payment_proofs (appointment_id, user_id, image_url, status) values (${a11}, ${B}, 'x', 'PENDING'), (${a12}, ${C}, 'x', 'PENDING'), (${a1}, ${A}, 'x', 'APPROVED')`;
    // Proofs that must not count as "to review": one superseded by a newer rejected upload, and one on a cancelled booking
    const x1 = await appt({ date: "2026-03-02", time: "10:00-11:00", status: "AWAITING_PROOF", user: B, s: S1, n: N2, created: "2026-02-20 05:00:00" });
    const x2 = await appt({ date: "2026-03-03", time: "10:00-11:00", status: "CANCELLED", user: C, s: S1, n: N2, created: "2026-02-20 05:00:00" });
    await db`insert into payment_proofs (appointment_id, user_id, image_url, status, created_at) values
      (${x1}, ${B}, 'x', 'PENDING', '2026-03-01 05:00:00'), (${x1}, ${B}, 'x', 'REJECTED', '2026-03-01 06:00:00'), (${x2}, ${C}, 'x', 'PENDING', '2026-03-01 05:00:00')`;

    dashboard = await import("../../server/dashboard");
    handlers = await import("../../server/handlers/dashboard");
    utilization = await import("../../server/utilization");
  });

  afterAll(async () => {
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("the month against September: visits completed with the tracker and returning clients", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.period).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(d.previous).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    // completed with the tracker's Complete visit, by that day: a1, a2, a3 (not a4, no record); a7, a13
    expect(d.totals.appointments).toEqual({ value: 3, previous: 2 });
    // two or more visits completed with the tracker by today (14 Oct): Ana (a1, then a3 on 7 Oct);
    // none by 30 Sep. Cara's a4 and Dana's retired-service visit have no record, so they have one each
    expect(d.overview.returningClients).toBe(1);
    const september = await dashboard.buildDashboard("month", new Date("2026-09-30T02:00:00Z"));
    expect(september.overview.returningClients).toBe(0);
  });

  it("visits to complete: the list filter and the bell's notifications match the count", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    try {
      const booking = await import("../../server/handlers/booking");
      as("user_admin");
      const list = await callRoute(booking.listAllAppointments, "/api/booking/appointments?page=1&complete=due");
      // before the cut-off, so not listed (the queue's own tests cover visits after it)
      expect(list.body.rows).toEqual([]);

      const visits = await import("../../server/visitsToComplete");
      await db`delete from admin_notifications`;
      await visits.recordVisitsToComplete(NOW); // the cutoff is after these visits: none
      expect(await db`select 1 from admin_notifications`).toHaveLength(0);
      await visits.recordVisitsToComplete(NOW, "2026-10-01");
      await visits.recordVisitsToComplete(NOW, "2026-10-01");
      expect(await db`select kind from admin_notifications`).toEqual([{ kind: "visit_to_complete" }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("the month: rates, lapsed clients, rewards redeemed and what needs attention", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.rates.cancellation).toEqual({ value: 2 / 9, previous: 0 });
    expect(d.rates.conversion).toEqual({ value: 2 / 6, previous: 1 });
    // repeat rate, by the tracker: October's clients Ana and Bea had nothing completed before 1 Oct;
    // September's Cara and Dana neither
    expect(d.rates.returning).toEqual({ value: 0, previous: 0 });
    // by the tracker: Eve's June visit and Cara's a4 have no record, so Eve isn't a client yet and
    // nobody's last completed visit (Cara 15 Sep, Dana 20 Sep) is over 60 days back
    expect(d.lapsedClients).toBe(0);
    expect(d.overview.loyaltyRedeemed).toBe(1); // the redeem scanned on 6 Oct
    // proofs to review: a booking whose latest upload is still pending, paid by proof (a11, a12);
    // unpaid: bookings still PENDING (a11), the same list the Appointments filter shows
    // to complete: the 09:00-10:00 visit today is over, but it's before the 16 Oct cut-off (visits
    // from before visit completion existed aren't to-dos); photos: a3 was completed without any
    expect(d.attention).toEqual({ today: 2, proofsToReview: 2, unpaid: 1, toComplete: 0, photosToAdd: 1, warmLeads: 0 });
    // leads: accounts made in the period; Ana and Bea both booked (September: Cara did)
    expect(d.rates.leadConversion).toEqual({ value: 1, previous: 1 });
    expect(d.leads).toEqual({ accounts: 2, booked: 2 });
  });

  it("lapsed clients count only visits completed with the tracker", async () => {
    // Eve's 1 June visit, completed with Complete visit that day (no downpayment, 800 at the salon)
    const [eve] = await db<{ id: number }[]>`select id from appointments where appointment_date = '2026-06-01'`;
    await db`insert into visit_completions (appointment_id, balance_amount, payment_method, nailist_id, created_at) values (${eve.id}, 800, 'Cash', (select nailist_id from appointments where id = ${eve.id}), '2026-06-01 05:00:00')`;
    try {
      const d = await dashboard.buildDashboard("month", NOW);
      expect(d.lapsedClients).toBe(1); // Eve, last completed 1 June
    } finally {
      await db`delete from visit_completions where appointment_id = ${eve.id}`;
    }
  });

  it("the salon at a glance, for the period against the one before", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.totals).toEqual({
      // client accounts with a visit completed with the tracker: Ana (a1, a3) and Bea (a2) in October;
      // Cara (a7) and Dana (a13) in September (not the walk-in guest)
      clients: { value: 2, previous: 2 },
      // booked (before 18 Oct, confirmed or completed): Gel Manicure, Soft Gel and Nail Art in
      // October; Gel Manicure, Soft Gel and the retired service in September
      services: { value: 3, previous: 3 },
      // Maxine and Jun in October; only Jun in September
      artists: { value: 2, previous: 1 },
      // visits completed with the tracker: a1, a2, a3; a7, a13
      appointments: { value: 3, previous: 2 },
      trend: expect.any(Array),
    });
    const week = await dashboard.buildDashboard("week", NOW);
    // 12-18 Oct: nothing completed yet; a8's Gel Manicure with Maxine and Ana's Soft Gel with Jun
    // booked today. 5-11 Oct: Ana's a3 completed; a3's Soft Gel and a4's Nail Art, Maxine and Jun
    expect(week.totals).toMatchObject({
      clients: { value: 0, previous: 1 },
      services: { value: 2, previous: 2 },
      artists: { value: 2, previous: 2 },
      appointments: { value: 0, previous: 1 },
    });
  });

  it("the salon at a glance: lines of the same counts within each day", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    const points = d.totals.trend;
    expect(points.map((p) => p.date)).toEqual(d.trend.points.map((p) => p.date)); // the same days as the other lines
    const on = (date: string) => points.find((p) => p.date === date)!;
    // 1 Oct: Ana's a1 completed, her Gel Manicure with Maxine; 2 Oct: Bea's a2; 7 Oct: Ana's a3
    expect(on("2026-10-01")).toMatchObject({ clients: 1, appointments: 1, services: 1, artists: 1 });
    expect(on("2026-10-02")).toMatchObject({ clients: 1, appointments: 1 });
    expect(on("2026-10-07")).toMatchObject({ clients: 1, appointments: 1 });
    expect(on("2026-10-05")).toMatchObject({ clients: 0, appointments: 0, services: 0, artists: 0 });
    expect(points.reduce((n, p) => n + p.appointments, 0)).toBe(d.totals.appointments.value);
  });

  it("the Dashboard's Service mix and Salon notes follow the period", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    const { overview } = d;
    expect(overview.services).toEqual(d.services); // the same as Top services
    // booked in October before 18 Oct: a1, a2, a3, a4, a8 and Ana's Soft Gel (not the walk-in's on the 20th)
    expect(overview.weekdays.reduce((n, w) => n + w.bookings, 0)).toBe(6);
    expect(overview.artists.reduce((n, a) => n + a.bookings, 0)).toBe(6);
    expect(overview.decided).toBe(9);
    expect(overview.cancellation).toBe(d.rates.cancellation.value);
    expect(overview.conversion).toBe(d.rates.conversion.value);
    // a second visit done with the tracker by today: Ana (a1, a3)
    expect(overview.returningClients).toBe(1);
    expect(overview.loyaltyRedeemed).toBe(1);
    const september = await dashboard.buildDashboard("month", new Date("2026-09-30T02:00:00Z"));
    expect(september.overview.weekdays.reduce((n, w) => n + w.bookings, 0)).toBe(3); // a7, a13, the retired service
  });

  it("all time: from the first day on record, a point per month, nothing to compare with", async () => {
    const d = await dashboard.buildDashboard("all", NOW);
    // the first booking's day (2 March) to the last (22 October)
    expect(d.period).toEqual({ from: "2026-03-02", to: "2026-10-22" });
    expect(d.trend.granularity).toBe("month");
    expect(d.trend.points.map((p) => p.date)).toEqual(["2026-03-02", "2026-04-01", "2026-05-01", "2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"]);
    // everything: the clients and visits completed with the tracker, every booked visit before 18 Oct
    expect(d.totals.clients.value).toBe(4);
    expect(d.totals.appointments.value).toBe(5);
    expect(d.overview.services.reduce((n, s) => n + s.bookings, 0)).toBe(10);
    // nothing before it: every previous value is empty
    expect(d.totals.appointments.previous).toBe(0);
    expect(d.rates.cancellation.previous).toBeNull();
    expect(d.bookingsTrend.granularity).toBe("month");
    expect(d.bookingsTrend.points.map((b) => b.date)).toEqual(d.trend.points.map((p) => p.date));
    // June: Eve's visit, marked completed before the tracker, counts by its status
    expect(d.bookingsTrend.points.find((b) => b.date === "2026-06-01")).toEqual({ date: "2026-06-01", completed: 1, cancelled: 0 });
  });

  it("the salon at a glance over a year: services and artists counted once per month", async () => {
    const d = await dashboard.buildDashboard("year", NOW);
    // October: Gel Manicure, Soft Gel and Nail Art; Maxine and Jun (booked before 18 Oct)
    expect(d.totals.trend.find((p) => p.date === "2026-10-01")).toMatchObject({ services: 3, artists: 2 });
  });

  it("the month: a sales record of every visit completed with the tracker, latest first", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    // a4 (8 Oct) was marked completed without the tracker, so it isn't a sale here
    expect(d.sales.map((s) => [s.date, s.client_name, s.service_name, s.nailist_name, s.fee])).toEqual([
      ["2026-10-06", "Ana A", "Soft Gel Extensions", "Maxine", 1700],
      ["2026-10-02", "Bea B", "Gel Manicure", "Jun", 500],
      ["2026-10-01", "Ana A", "Gel Manicure", "Maxine", 800],
    ]);
    expect(d.sales.reduce((sum, s) => sum + (s.fee ?? 0), 0)).toBe(3000);
    expect(d.sales[0]).toMatchObject({ time: "10:00-11:00", user_id: expect.any(Number) });
    // September: a13 and a7; the retired service's visit has no completion record
    const sept = await dashboard.buildDashboard("month", new Date("2026-09-30T02:00:00Z"));
    expect(sept.sales.map((s) => [s.date, s.fee])).toEqual([["2026-09-20", 1200], ["2026-09-15", 500]]);
  });

  it("the month: money for the financial statements, from the downpayments and the completed visits", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.money).toMatchObject({
      // money in by the day paid: p1, p2 (1 Oct in Manila), p3, p5 (not p4, unpaid; not p8, November),
      // plus the balances recorded at completion: a1 300, a2 0, a3 1,200; none refunded.
      // September: p6 + p7, and a7 0 + a13 700
      grossReceipts: { value: 3500, previous: 1700 },
      // every paid downpayment by today was earned or forfeited; September's were all earned by its end
      unearned: { value: 0, previous: 0 },
      // a5 was cancelled, so its downpayment was kept: dated by its visit's day (9 Oct), as it has no
      // cancelled_at; no late fees
      otherIncome: { value: 500, previous: 0 },
      refunds: { value: 0, previous: 0 },
      // earned: the downpayments of the visits done in October (p1, p2, p3 with the tracker; p8, a4's,
      // marked completed on 8 Oct before the tracker) + their balances (300 + 0 + 1,200) + a5's kept
      // downpayment. September: p6 + p7, balances 0 + 700
      revenue: { value: 4000, previous: 1700 },
    });
  });

  it("the month: held, forfeited and refunded downpayments by the days they were recorded, with lines that add up", async () => {
    const [refunded] = await db<{ id: number }[]>`select id from appointments where status = 'REFUNDED' and appointment_date = '2026-10-10'`;
    // a8 (confirmed for today) paid on 5 Oct; a5 cancelled on 3 Oct; the refunded booking paid on 2 Oct, refunded on 11 Oct
    await db`update payments set status = 'PAID', paid_at = '2026-10-05 02:00:00' where external_id = 'p4'`;
    await db`update appointments set cancelled_at = '2026-10-03 02:00:00' where id = (select appointment_id from payments where external_id = 'p5')`;
    await db`update appointments set cancelled_at = '2026-10-11 02:00:00', refunded_at = '2026-10-11 02:00:00' where id = ${refunded.id}`;
    await db`insert into payments (id, appointment_id, amount, status, payment_method, external_id, created_at, paid_at)
             values (${crypto.randomUUID()}, ${refunded.id}, 500, 'PAID', 'MANUAL', 'p9', '2026-10-02 02:00:00', '2026-10-02 02:00:00')`;
    try {
      const d = await dashboard.buildDashboard("month", NOW);
      expect(d.money).toMatchObject({
        // 3,500 as before, plus p4 and p9 paid, less p9 refunded
        grossReceipts: { value: 4000, previous: 1700 },
        // a8's downpayment, held for today's visit
        unearned: { value: 500, previous: 0 },
        otherIncome: { value: 500, previous: 0 },
        refunds: { value: 500, previous: 0 },
        // as before: a8's held downpayment isn't earned yet, and p9 was refunded
        revenue: { value: 4000, previous: 1700 },
      });
      const points = d.money.points;
      // a point per trend day, 1 to 14 Oct
      expect(points.map((p) => p.date)).toEqual(d.trend.points.map((p) => p.date));
      const sum = (key: "grossReceipts" | "revenue" | "otherIncome" | "refunds") => points.reduce((total, p) => total + p[key], 0);
      expect(sum("grossReceipts")).toBe(d.money.grossReceipts.value);
      expect(sum("revenue")).toBe(d.money.revenue.value);
      expect(sum("otherIncome")).toBe(d.money.otherIncome.value);
      expect(sum("refunds")).toBe(d.money.refunds.value);
      const on = (date: string) => points.find((p) => p.date === date)!;
      // the forfeit on the day it was cancelled, the refund on the day it was refunded
      expect(on("2026-10-03").otherIncome).toBe(500);
      expect(on("2026-10-11").refunds).toBe(500);
      // held at the end of 4 Oct: p3 (a3, completed on 7 Oct) and p9 (refunded on 11 Oct)
      expect(on("2026-10-04").unearned).toBe(1000);
      expect(points[points.length - 1].unearned).toBe(d.money.unearned.value);
      // A payment that arrived after its booking was cancelled is owed back, not kept: held until
      // refunded. p9 paid on 12 Oct, two days after the booking (now cancelled) was cancelled.
      await db`update appointments set status = 'CANCELLED', refunded_at = null where id = ${refunded.id}`;
      await db`update payments set paid_at = '2026-10-12 02:00:00', created_at = '2026-10-12 02:00:00' where external_id = 'p9'`;
      const late = await dashboard.buildDashboard("month", NOW);
      expect(late.money).toMatchObject({
        // 3,500, plus p4 and p9 paid; nothing refunded
        grossReceipts: { value: 4500, previous: 1700 },
        // a8's downpayment and p9, owed back
        unearned: { value: 1000, previous: 0 },
        // a5's only: p9 isn't a forfeit
        otherIncome: { value: 500, previous: 0 },
        refunds: { value: 0, previous: 0 },
        revenue: { value: 4000, previous: 1700 },
      });
    } finally {
      await db`delete from payments where external_id = 'p9'`;
      await db`update payments set status = 'PENDING', paid_at = null where external_id = 'p4'`;
      await db`update appointments set status = 'REFUNDED' where id = ${refunded.id}`;
      await db`update appointments set cancelled_at = null, refunded_at = null where cancelled_at is not null or refunded_at is not null`;
    }
  });

  it("the month: charts and lists", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    // a bar pair per week from the 1st, up to today: visits before 18 Oct by their status, on the
    // visit's day (a1, a2, a3 the first week; a4 on the 8th); a5 cancelled on the 9th, the refunded
    // one on the 10th
    expect(d.bookingsTrend).toEqual({
      granularity: "week",
      points: [{ date: "2026-10-01", completed: 3, cancelled: 0 }, { date: "2026-10-08", completed: 1, cancelled: 2 }],
    });
    // a week shows a pair per day
    const week = await dashboard.buildDashboard("week", NOW);
    expect(week.bookingsTrend.granularity).toBe("day");
    expect(week.bookingsTrend.points.map((b) => b.date)).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
    // booked in October before 18 Oct (not the walk-in's on the 20th, not completed with the
    // tracker); sales from the completed ones, a4 at its list price
    expect(d.services).toEqual([
      { name: "Gel Manicure", bookings: 3, estimatedSales: 1300 },
      { name: "Soft Gel Extensions", bookings: 2, estimatedSales: 1700 },
      { name: "Nail Art", bookings: 1, estimatedSales: 300 },
    ]);
    expect(d.weekdays).toEqual([
      { weekday: 1, bookings: 0 }, { weekday: 2, bookings: 2 }, { weekday: 3, bookings: 2 }, { weekday: 4, bookings: 2 },
      { weekday: 5, bookings: 1 }, { weekday: 6, bookings: 0 }, { weekday: 7, bookings: 0 },
    ]);
    expect(d.artists).toEqual([{ name: "Jun", bookings: 4 }, { name: "Maxine", bookings: 3 }]);
    // by status: every visit is before 18 Oct but the walk-in's, still confirmed
    expect(d.outcomes).toEqual({ confirmed: 3, completed: 4, pending: 2, cancelled: 1, refunded: 1 });
    // 09:00 today is already past at 10:00; the walk-in client is named from the appointment
    expect(d.next.map((n) => [n.appointment_date, n.appointment_time, n.client_name])).toEqual([
      ["2026-10-14", "15:00-16:00", "Dana D"],
      ["2026-10-20", "10:00-11:00", "Walk In"],
    ]);
  });

  it("from 18 Oct a visit marked completed without the tracker isn't counted as done", async () => {
    // the walk-in's visit on the 20th, marked completed without Complete visit
    const [walkIn] = await db<{ id: number }[]>`select id from appointments where appointment_date = '2026-10-20'`;
    await db`update appointments set status = 'COMPLETED' where id = ${walkIn.id}`;
    try {
      const d = await dashboard.buildDashboard("month", NOW);
      expect(d.bookingsTrend.points.reduce((n, b) => n + b.completed, 0)).toBe(4);
      expect(d.outcomes).toMatchObject({ confirmed: 2, completed: 4 }); // left out of both
      expect(d.services.find((s) => s.name === "Nail Art")).toEqual({ name: "Nail Art", bookings: 1, estimatedSales: 300 });
      expect(d.overview.services.reduce((n, s) => n + s.bookings, 0)).toBe(6);
      // completed with the tracker, it counts
      await db`insert into visit_completions (appointment_id, balance_amount, payment_method, nailist_id, created_at)
               values (${walkIn.id}, 300, 'Cash', (select nailist_id from appointments where id = ${walkIn.id}), '2026-10-20 05:00:00')`;
      const done = await dashboard.buildDashboard("month", NOW);
      expect(done.outcomes).toMatchObject({ completed: 5 });
      expect(done.services.find((s) => s.name === "Nail Art")).toEqual({ name: "Nail Art", bookings: 2, estimatedSales: 600 });
      expect(done.overview.services.reduce((n, s) => n + s.bookings, 0)).toBe(7);
    } finally {
      await db`delete from visit_completions where appointment_id = ${walkIn.id}`;
      await db`update appointments set status = 'CONFIRMED' where id = ${walkIn.id}`;
    }
  });

  it("the rate cards' lines: each rate so far in the period, on the trend's days", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.rateTrend.map((p) => p.date)).toEqual(d.trend.points.map((p) => p.date));
    const today = d.rateTrend[d.rateTrend.length - 1];
    // everything counted happened by today, so the line ends at the card's rate
    expect(today.conversion).toBe(d.rates.conversion.value);
    expect(today.leadConversion).toBe(d.rates.leadConversion.value);
    expect(today.returning).toBe(d.rates.returning.value);
    // cancellations by the visit's day: by today a5 and the refunded one of the 8 decided visits;
    // the card also counts the walk-in's visit on the 20th (2 of 9)
    expect(today.cancellation).toBe(2 / 8);
    // 1 Oct: a1 decided, nothing cancelled; Bea's account, made at 01:00 that day, has booked
    expect(d.rateTrend[0]).toMatchObject({ date: "2026-10-01", cancellation: 0, leadConversion: 1 });
  });

  it("the trend: a point per day up to today, weekly and monthly for the longer ranges", async () => {
    const month = (await dashboard.buildDashboard("month", NOW)).trend;
    expect(month.granularity).toBe("day");
    expect(month.points).toHaveLength(14); // 1 to 14 Oct: the line stops today
    const day = (date: string) => month.points.find((p) => p.date === date);
    expect(day("2026-10-01")).toMatchObject({ date: "2026-10-01", collected: 500, estimatedSales: 800, bookings: 1, newClients: 1 }); // a1's downpayment and Bea, 1 Oct in Manila
    expect(day("2026-10-02")).toMatchObject({ date: "2026-10-02", collected: 500, estimatedSales: 500, bookings: 1, newClients: 0 }); // a2, though paid on 1 Oct
    expect(day("2026-10-03")).toMatchObject({ date: "2026-10-03", collected: 0, estimatedSales: 0, bookings: 0, newClients: 1 }); // p3 was paid today, for a3 on the 6th
    expect(day("2026-10-06")).toMatchObject({ bookings: 0 }); // a3's visit day; it was completed the 7th
    expect(day("2026-10-07")).toMatchObject({ bookings: 1 }); // a3's completion was recorded the next day
    expect(day("2026-10-08")).toMatchObject({ bookings: 0 }); // a4 has no completion record
    expect(day("2026-10-14")).toMatchObject({ bookings: 0 }); // confirmed, not completed yet
    expect(month.points.reduce((sum, p) => sum + p.bookings, 0)).toBe(3);

    const quarter = (await dashboard.buildDashboard("last90", NOW)).trend;
    expect(quarter.granularity).toBe("week");
    expect(quarter.points).toHaveLength(13);
    expect(quarter.points[0].date).toBe("2026-07-17");
    expect(quarter.points[12]).toMatchObject({ date: "2026-10-09", bookings: 0 });
    expect(quarter.points[11]).toMatchObject({ date: "2026-10-02", bookings: 2 }); // a2, a3 (completed on the 7th)

    const year = (await dashboard.buildDashboard("year", NOW)).trend;
    expect(year.granularity).toBe("month");
    expect(year.points).toHaveLength(10);
    const monthPoint = (date: string) => year.points.find((p) => p.date === date);
    expect(monthPoint("2026-03-01")).toMatchObject({ date: "2026-03-01", collected: 0, estimatedSales: 0, bookings: 0, newClients: 0 });
    expect(monthPoint("2026-06-01")).toMatchObject({ bookings: 0, estimatedSales: 0 }); // marked completed without the tracker
    expect(monthPoint("2026-09-01")).toMatchObject({ date: "2026-09-01", collected: 1000, estimatedSales: 1700, bookings: 2, newClients: 1 });
    expect(monthPoint("2026-10-01")).toMatchObject({ date: "2026-10-01", collected: 1500, estimatedSales: 3000, bookings: 3, newClients: 2 });
  });

  it("the week runs Monday to Sunday and is compared with the week before", async () => {
    const d = await dashboard.buildDashboard("week", NOW);
    expect(d.period).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    // nothing completed this week; last week a3 (completed 7 Oct)
    expect(d.totals.appointments).toEqual({ value: 0, previous: 1 });
  });

  it("warm leads: accounts that haven't booked, active in the last 60 days, and the list behind them", async () => {
    const user = async (clerk: string, createdAt: string) =>
      (await db<{ id: number }[]>`insert into users (clerk_id, email, role, created_at) values (${clerk}, ${`${clerk}@x.test`}, 'customer', ${createdAt}) returning id`)[0].id;
    const F = await user("user_f", "2026-10-05 05:00:00"); // signed up, never booked
    const G = await user("user_g", "2026-10-06 05:00:00"); // started a booking, never paid
    const H = await user("user_h", "2026-06-01 05:00:00"); // signed up long ago: not warm any more
    const I = await user("user_i", "2026-05-01 05:00:00"); // old account, but started a booking this week: warm
    const [s] = await db<{ id: number }[]>`select id from services where name = 'Gel Manicure'`;
    const [n] = await db<{ id: number }[]>`select id from nailists where name = 'Jun'`;
    const started = (u: number, time: string, created: string) =>
      db`insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status, created_at)
         values (${u}, ${s.id}, 'Gel Manicure', ${n.id}, 'Jun', '2026-10-25', ${time}, 'PENDING', ${created})`;
    await started(G, "10:00-11:00", "2026-10-07 05:00:00");
    await started(I, "13:00-14:00", "2026-10-12 05:00:00");
    try {
      const d = await dashboard.buildDashboard("month", NOW);
      expect(d.attention.warmLeads).toBe(3); // F, G and I
      expect(d.rates.leadConversion).toEqual({ value: 2 / 4, previous: 1 }); // Ana, Bea of Ana, Bea, F, G
      expect(d.leads).toEqual({ accounts: 4, booked: 2 });

      as("user_admin");
      const list = await callRoute(handlers.listWarmLeads, "/api/leads");
      expect(list.body).toEqual({ clerkIds: ["user_f", "user_g", "user_i"] });
      as("user_a");
      expect((await callRoute(handlers.listWarmLeads, "/api/leads")).status).toBe(403);
    } finally {
      await db`delete from appointments where user_id in (${G}, ${I})`;
      await db`delete from users where id in (${F}, ${G}, ${H}, ${I})`;
    }
  });

  it("artist utilization: booked of offered slots per day, with days off, for the week of a date", async () => {
    const [maxine] = await db<{ id: number }[]>`select id from nailists where name = 'Maxine'`;
    const [jun] = await db<{ id: number }[]>`select id from nailists where name = 'Jun'`;
    // only these two artists offer slots (the dev seed's artists and their slots are cleared)
    await db`delete from nailist_time_slots`;
    await db`delete from nailist_day_offs`;
    await db`insert into nailist_time_slots (nailist_id, start_time, end_time) values
      (${maxine.id}, '10:00', '11:00'), (${maxine.id}, '12:00', '13:00'), (${maxine.id}, '14:00', '15:00'), (${maxine.id}, '15:00', '16:00'),
      (${jun.id}, '09:00', '10:00'), (${jun.id}, '13:00', '14:00')`;
    await db`insert into nailist_day_offs (nailist_id, day_off_type, day_of_week) values (${jun.id}, 'REGULAR', 4)`; // Thursdays
    await db`insert into nailist_day_offs (nailist_id, day_off_type, date) values (${maxine.id}, 'CUSTOM', '2026-10-16')`; // that Friday
    try {
      // any date picks its Monday-to-Sunday week; Wednesday 14 Oct has one booking each (a cancelled
      // and a refunded booking elsewhere in the month don't count)
      const u = await utilization.buildUtilization("2026-10-15");
      expect(u.week).toEqual({ from: "2026-10-12", to: "2026-10-18" });
      const row = (name: string) => u.artists.find((a) => a.name === name)!;
      expect(row("Maxine")).toMatchObject({ title: "Master Technician", rate: 1 / 24 });
      expect(row("Maxine").days.map((d) => [d.date, d.offered, d.booked, d.off])).toEqual([
        ["2026-10-12", 4, 0, false], ["2026-10-13", 4, 0, false], ["2026-10-14", 4, 1, false], ["2026-10-15", 4, 0, false],
        ["2026-10-16", 0, 0, true], ["2026-10-17", 4, 0, false], ["2026-10-18", 4, 0, false],
      ]);
      expect(row("Jun")).toMatchObject({ title: "Junior Technician", rate: 1 / 12 });
      expect(row("Jun").days.find((d) => d.date === "2026-10-15")).toEqual({ date: "2026-10-15", offered: 0, booked: 0, off: true });
      expect(u.overall).toBe(2 / 36);

      // the week of the 5th: Maxine's Soft Gel on the 6th; a booking on an artist's day off still shows
      const earlier = await utilization.buildUtilization("2026-10-05");
      expect(earlier.week.from).toBe("2026-10-05");
      expect(earlier.artists.find((a) => a.name === "Jun")!.days.find((d) => d.date === "2026-10-08")).toEqual({
        date: "2026-10-08", offered: 0, booked: 1, off: true, // Cara's Nail Art, on a Thursday
      });

      as("user_admin");
      expect((await callRoute(handlers.getUtilization, "/api/utilization?week=soon")).status).toBe(400);
      const ok = await callRoute(handlers.getUtilization, "/api/utilization?week=2026-10-15");
      expect(ok.status).toBe(200);
      expect((ok.body as { week: unknown }).week).toEqual({ from: "2026-10-12", to: "2026-10-18" });
      as("user_a");
      expect((await callRoute(handlers.getUtilization, "/api/utilization")).status).toBe(403);
    } finally {
      await db`delete from nailist_time_slots`;
      await db`delete from nailist_day_offs`;
    }
  });

  it("an unknown range is refused, a customer is refused, an admin gets the document", async () => {
    as("user_admin");
    const bad = await callRoute(handlers.getDashboard, "/api/dashboard?range=decade");
    expect(bad.status).toBe(400);
    const ok = await callRoute(handlers.getDashboard, "/api/dashboard?range=week");
    expect(ok.status).toBe(200);
    expect(Object.keys(ok.body).sort()).toEqual(
      ["artists", "attention", "bookingsTrend", "clientBase", "kpis", "lapsedClients", "leads", "loyalty", "money", "next", "outcomes", "overview", "period", "previous", "range", "rateTrend", "rates", "sales", "services", "totals", "trend", "weekdays"].sort(),
    );
    expect((await callRoute(handlers.getDashboard, "/api/dashboard?range=all")).status).toBe(200);
    as("user_a");
    expect((await callRoute(handlers.getDashboard, "/api/dashboard")).status).toBe(403);
    as(null);
    expect((await callRoute(handlers.getDashboard, "/api/dashboard")).status).toBe(401);
  });

  it("an empty database gives zeros and 'no data', never NaN", async () => {
    await db`truncate users, scan_history restart identity cascade`;
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.rates).toEqual({
      cancellation: { value: null, previous: null }, conversion: { value: null, previous: null },
      returning: { value: null, previous: null }, leadConversion: { value: null, previous: null },
    });
    expect(d.bookingsTrend.points.every((b) => b.completed === 0 && b.cancelled === 0)).toBe(true);
    expect(d.weekdays).toHaveLength(7);
    expect([d.services, d.artists, d.next]).toEqual([[], [], []]);
    expect(d.attention).toEqual({ today: 0, proofsToReview: 0, unpaid: 0, toComplete: 0, photosToAdd: 0, warmLeads: 0 });
    expect(d.money).toEqual({
      grossReceipts: { value: 0, previous: 0 }, unearned: { value: 0, previous: 0 }, revenue: { value: 0, previous: 0 },
      otherIncome: { value: 0, previous: 0 }, refunds: { value: 0, previous: 0 }, points: expect.any(Array),
    });
    expect(d.lapsedClients).toBe(0);
    expect(d.sales).toEqual([]);
    expect(d.totals).toMatchObject({ clients: { value: 0, previous: 0 }, appointments: { value: 0, previous: 0 } });
    // the trend still has its 14 daily points, all zero
    expect(d.trend.points).toHaveLength(14);
    expect(d.trend.points.every((p) => p.bookings === 0)).toBe(true);
  });
});
