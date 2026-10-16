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

  it("the month: headline cards against September", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.period).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(d.previous).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(d.kpis).toEqual({
      collected: { value: 2000, previous: 1000 }, // completed visits' downpayments, by visit date: p1+p2+p3+p8 (not p5, cancelled); p6+p7
      estimatedSales: { value: 3100, previous: 1700 }, // 800+500+1500+300; 500+1200 (+ a service with no price)
      bookings: { value: 7, previous: 3 }, // 4 completed + 3 confirmed; 3 completed
      newClients: { value: 2, previous: 1 }, // Ana, Bea (not the walk-in guest); Cara
    });
  });

  it("the month: rates, lapsed clients, loyalty and what needs attention", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.rates.cancellation).toEqual({ value: 2 / 9, previous: 0 });
    expect(d.rates.conversion).toEqual({ value: 2 / 6, previous: 1 });
    expect(d.rates.returning).toEqual({ value: 1 / 3, previous: 0 });
    expect(d.rates.averageSale).toEqual({ value: 775, previous: 567 });
    expect(d.lapsedClients).toBe(1); // Eve, last seen 1 June
    // everyone with a completed visit: Ana 800+1500, Bea 500, Cara 300+500, Dana 1200 (+ a service
    // with no price), Eve 800 = 5,600 over 5 clients; Eve has lapsed
    expect(d.clientBase).toEqual({ clients: 5, lifetimeValue: 1120, churn: 1 / 5 });
    expect(d.loyalty).toEqual({ stamps: 3, redeemed: 1 });
    // proofs to review: a booking whose latest upload is still pending, paid by proof (a11, a12);
    // unpaid: bookings still PENDING (a11), the same list the Appointments filter shows
    expect(d.attention).toEqual({ today: 2, proofsToReview: 2, unpaid: 1, toConfirm: 0, warmLeads: 0 });
    // leads: accounts made in the period; Ana and Bea both booked (September: Cara did)
    expect(d.rates.leadConversion).toEqual({ value: 1, previous: 1 });
    expect(d.leads).toEqual({ accounts: 2, booked: 2 });
  });

  it("the salon at a glance: clients, services on the menu, artists, upcoming appointments", async () => {
    await db`insert into services (name, master_price, junior_price, is_active) values ('Retired Polish', 100, 100, 0)`;
    const [{ services }] = await db<{ services: number }[]>`select count(*)::int as services from services where is_active = 1`;
    const [{ artists }] = await db<{ artists: number }[]>`select count(*)::int as artists from nailists`;
    const d = await dashboard.buildDashboard("week", NOW);
    expect(d.totals).toMatchObject({
      clients: 5, // Ana, Bea, Cara, Dana, Eve: not the walk-in guest or the admin
      services, // the inactive one left out
      artists,
      upcoming: 3, // confirmed from today on, the same as Booked ahead
    });
    expect(d.totals.upcoming).toBe(d.money.bookedAhead.visits);
  });

  it("the salon at a glance: lines for clients, services and artists booked, and upcoming visits per day", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    const points = d.totals.trend;
    expect(points.map((p) => p.date)).toEqual(d.trend.points.map((p) => p.date)); // the same days as the other lines
    // clients: a running total that ends at today's count; Ana signed up on the 3rd, so the 2nd has one fewer
    expect(points[points.length - 1].clients).toBe(d.totals.clients);
    expect(points.find((p) => p.date === "2026-10-02")!.clients).toBe(d.totals.clients - 1);
    // 1 Oct: Ana's Gel Manicure with Maxine; 6 Oct: Ana's Soft Gel with Maxine
    expect(points.find((p) => p.date === "2026-10-01")).toMatchObject({ services: 1, artists: 1 });
    expect(points.find((p) => p.date === "2026-10-05")).toMatchObject({ services: 0, artists: 0 });
    // upcoming visits per day: two today, the walk-in's on the 20th
    const days = d.money.bookedAhead.days;
    expect(days.find((x) => x.date === "2026-10-14")?.visits).toBe(2);
    expect(days.find((x) => x.date === "2026-10-20")?.visits).toBe(1);
    expect(days.reduce((n, x) => n + x.visits, 0)).toBe(d.totals.upcoming);
  });

  it("the salon at a glance over a year: services and artists counted once per month", async () => {
    const d = await dashboard.buildDashboard("year", NOW);
    // October: Gel Manicure, Soft Gel and Nail Art; Maxine and Jun (confirmed and completed)
    expect(d.totals.trend.find((p) => p.date === "2026-10-01")).toMatchObject({ services: 3, artists: 2 });
  });

  it("the month: a sales record of every completed visit, newest first, adding up to estimated sales", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.sales.map((s) => [s.date, s.client_name, s.service_name, s.nailist_name, s.fee])).toEqual([
      ["2026-10-08", "Cara C", "Nail Art", "Jun", 300],
      ["2026-10-06", "Ana A", "Soft Gel Extensions", "Maxine", 1500],
      ["2026-10-02", "Bea B", "Gel Manicure", "Jun", 500],
      ["2026-10-01", "Ana A", "Gel Manicure", "Maxine", 800],
    ]);
    expect(d.sales.reduce((sum, s) => sum + (s.fee ?? 0), 0)).toBe(d.kpis.estimatedSales.value);
    expect(d.sales[0]).toMatchObject({ time: "10:00-11:00", user_id: expect.any(Number) });
    // a service no longer on the menu has no fee
    const sept = await dashboard.buildDashboard("month", new Date("2026-09-20T02:00:00Z"));
    expect(sept.sales.find((s) => s.service_name === "Retired Service")).toMatchObject({ fee: null });
  });

  it("the month: the money cards' lines add up to the cards, and Booked ahead looks 14 days ahead", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    const sum = (key: "balanceAtSalon" | "returningRevenue" | "lost") => d.trend.points.reduce((total, p) => total + p[key], 0);
    // every October visit is on or before today (14 Oct), so the line up to today covers them all
    expect(sum("balanceAtSalon")).toBe(d.money.balanceAtSalon.value);
    expect(sum("returningRevenue")).toBe(d.money.returningRevenue.value);
    expect(sum("lost")).toBe(d.money.lostToCancellations.value);
    expect(d.trend.points.find((p) => p.date === "2026-10-08")).toMatchObject({ returningRevenue: 300 });
    const ahead = d.money.bookedAhead.days;
    expect(ahead).toHaveLength(14);
    expect(ahead[0].date).toBe("2026-10-14");
    expect(ahead[13].date).toBe("2026-10-27");
    expect(ahead.find((x) => x.date === "2026-10-14")?.value).toBe(800 + 1200);
    expect(ahead.find((x) => x.date === "2026-10-20")?.value).toBe(300);
    expect(ahead.reduce((total, x) => total + x.value, 0)).toBe(d.money.bookedAhead.value);
  });

  it("the month: money worked out from list prices and downpayments", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.money).toEqual({
      // completed visits' list price less their paid downpayments, never below 0 per visit:
      // a1 800-500, a2 500-500, a3 1500-500, a4 300-500 (its downpayment was paid in November);
      // September: a7 500-500, a13 1200-500, and the service with no price counts as 0
      balanceAtSalon: { value: 1300, previous: 700 },
      // completed visits by clients with a completed visit before the period: Cara's Nail Art
      // (she came in September); in September nobody had come before
      returningRevenue: { value: 300, previous: 0 },
      // cancelled a5 (Gel with a junior, 500) and refunded (Soft Gel with a master, 1500)
      lostToCancellations: { value: 2000, previous: 0 },
      // confirmed from today on: a8 800, Soft Gel with a junior 1200, the walk-in's Nail Art 300
      bookedAhead: { value: 2300, visits: 3, days: expect.any(Array) },
    });
  });

  it("the month: charts and lists", async () => {
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.monthly).toEqual([
      { month: "2026-05", completed: 0, cancelled: 0 },
      { month: "2026-06", completed: 1, cancelled: 0 },
      { month: "2026-07", completed: 0, cancelled: 0 },
      { month: "2026-08", completed: 0, cancelled: 0 },
      { month: "2026-09", completed: 3, cancelled: 0 },
      { month: "2026-10", completed: 4, cancelled: 2 },
    ]);
    expect(d.services).toEqual([
      { name: "Gel Manicure", bookings: 3, estimatedSales: 1300 },
      { name: "Soft Gel Extensions", bookings: 2, estimatedSales: 1500 },
      { name: "Nail Art", bookings: 2, estimatedSales: 300 },
    ]);
    expect(d.weekdays).toEqual([
      { weekday: 1, bookings: 0 }, { weekday: 2, bookings: 2 }, { weekday: 3, bookings: 2 }, { weekday: 4, bookings: 2 },
      { weekday: 5, bookings: 1 }, { weekday: 6, bookings: 0 }, { weekday: 7, bookings: 0 },
    ]);
    expect(d.artists).toEqual([{ name: "Jun", bookings: 4 }, { name: "Maxine", bookings: 3 }]);
    expect(d.outcomes).toEqual({ confirmed: 3, completed: 4, pending: 2, cancelled: 1, refunded: 1 });
    // 09:00 today is already past at 10:00; the walk-in client is named from the appointment
    expect(d.next.map((n) => [n.appointment_date, n.appointment_time, n.client_name])).toEqual([
      ["2026-10-14", "15:00-16:00", "Dana D"],
      ["2026-10-20", "10:00-11:00", "Walk In"],
    ]);
  });

  it("the trend: a point per day up to today, weekly and monthly for the longer ranges", async () => {
    const month = (await dashboard.buildDashboard("month", NOW)).trend;
    expect(month.granularity).toBe("day");
    expect(month.points).toHaveLength(14); // 1 to 14 Oct: the line stops today
    const day = (date: string) => month.points.find((p) => p.date === date);
    expect(day("2026-10-01")).toMatchObject({ date: "2026-10-01", collected: 500, estimatedSales: 800, bookings: 1, newClients: 1 }); // a1's downpayment and Bea, 1 Oct in Manila
    expect(day("2026-10-02")).toMatchObject({ date: "2026-10-02", collected: 500, estimatedSales: 500, bookings: 1, newClients: 0 }); // a2, though paid on 1 Oct
    expect(day("2026-10-03")).toMatchObject({ date: "2026-10-03", collected: 0, estimatedSales: 0, bookings: 0, newClients: 1 }); // p3 was paid today, for a3 on the 6th
    expect(day("2026-10-06")).toMatchObject({ collected: 500, estimatedSales: 1500, bookings: 1 });
    expect(day("2026-10-08")).toMatchObject({ collected: 500, estimatedSales: 300, bookings: 1 }); // p8, paid in November
    expect(day("2026-10-14")).toMatchObject({ bookings: 2, estimatedSales: 0 });
    // the confirmed booking on 20 Oct is not in the line
    expect(month.points.reduce((sum, p) => sum + p.bookings, 0)).toBe(6);
    expect(month.points.reduce((sum, p) => sum + p.collected, 0)).toBe(2000);

    const quarter = (await dashboard.buildDashboard("last90", NOW)).trend;
    expect(quarter.granularity).toBe("week");
    expect(quarter.points).toHaveLength(13);
    expect(quarter.points[0].date).toBe("2026-07-17");
    expect(quarter.points[12]).toMatchObject({ date: "2026-10-09", bookings: 2 });

    const year = (await dashboard.buildDashboard("year", NOW)).trend;
    expect(year.granularity).toBe("month");
    expect(year.points).toHaveLength(10);
    const monthPoint = (date: string) => year.points.find((p) => p.date === date);
    expect(monthPoint("2026-03-01")).toMatchObject({ date: "2026-03-01", collected: 0, estimatedSales: 0, bookings: 0, newClients: 0 });
    expect(monthPoint("2026-06-01")).toMatchObject({ bookings: 1, estimatedSales: 800 });
    expect(monthPoint("2026-09-01")).toMatchObject({ date: "2026-09-01", collected: 1000, estimatedSales: 1700, bookings: 3, newClients: 1 });
    expect(monthPoint("2026-10-01")).toMatchObject({ date: "2026-10-01", collected: 2000, estimatedSales: 3100, bookings: 6, newClients: 2 });
  });

  it("the week runs Monday to Sunday and is compared with the week before", async () => {
    const d = await dashboard.buildDashboard("week", NOW);
    expect(d.period).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(d.kpis.bookings).toEqual({ value: 2, previous: 2 });
    expect(d.kpis.estimatedSales).toEqual({ value: 0, previous: 1800 });
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
      ["artists", "attention", "clientBase", "kpis", "lapsedClients", "leads", "loyalty", "money", "monthly", "next", "outcomes", "period", "previous", "range", "rates", "sales", "services", "totals", "trend", "weekdays"].sort(),
    );
    as("user_a");
    expect((await callRoute(handlers.getDashboard, "/api/dashboard")).status).toBe(403);
    as(null);
    expect((await callRoute(handlers.getDashboard, "/api/dashboard")).status).toBe(401);
  });

  it("an empty database gives zeros and 'no data', never NaN", async () => {
    await db`truncate users, scan_history restart identity cascade`;
    const d = await dashboard.buildDashboard("month", NOW);
    expect(d.kpis).toEqual({
      collected: { value: 0, previous: 0 }, estimatedSales: { value: 0, previous: 0 },
      bookings: { value: 0, previous: 0 }, newClients: { value: 0, previous: 0 },
    });
    expect(d.rates).toEqual({
      cancellation: { value: null, previous: null }, conversion: { value: null, previous: null },
      returning: { value: null, previous: null }, averageSale: { value: null, previous: null },
      leadConversion: { value: null, previous: null },
    });
    expect(d.monthly).toHaveLength(6);
    expect(d.monthly.every((m) => m.completed === 0 && m.cancelled === 0)).toBe(true);
    expect(d.weekdays).toHaveLength(7);
    expect([d.services, d.artists, d.next]).toEqual([[], [], []]);
    expect(d.attention).toEqual({ today: 0, proofsToReview: 0, unpaid: 0, toConfirm: 0, warmLeads: 0 });
    expect(d.money).toEqual({
      balanceAtSalon: { value: 0, previous: 0 }, returningRevenue: { value: 0, previous: 0 }, lostToCancellations: { value: 0, previous: 0 },
      bookedAhead: { value: 0, visits: 0, days: expect.any(Array) },
    });
    expect(d.lapsedClients).toBe(0);
    expect(d.sales).toEqual([]);
    expect(d.clientBase).toEqual({ clients: 0, lifetimeValue: null, churn: null });
    expect(d.totals).toMatchObject({ clients: 0, upcoming: 0 });
    // the trend still has its 14 daily points, all zero
    expect(d.trend.points).toHaveLength(14);
    expect(d.trend.points.every((p) => p.collected === 0 && p.estimatedSales === 0 && p.bookings === 0 && p.newClients === 0)).toBe(true);
  });
});
