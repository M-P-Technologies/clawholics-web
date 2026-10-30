// @vitest-environment node
// Integration test for the day-before reminders against a throwaway Postgres (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, resetTestDatabase } from "./testDatabase";

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }), clerkClient: async () => ({ users: { getUser: vi.fn(async () => null) } }) }));
vi.mock("next/server", () => ({ after: () => {} }));

// 09:00 on 14 June 2098 in Manila, so the visits to remind about are on the 15th
const RUN = new Date(Date.UTC(2098, 5, 14, 1, 0));
const TOMORROW = "2098-06-15";

describe.skipIf(!TEST_DATABASE_URL)("appointment reminders (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let reminders: typeof import("../../server/reminders");
  const ids: Record<string, number> = {};
  const sent: { to: string }[][] = [];

  const reminded = async (key: string) =>
    (await db<{ reminder_sent_at: string | null }[]>`select reminder_sent_at from appointments where id = ${ids[key]}`)[0].reminder_sent_at;

  beforeAll(async () => {
    db = await resetTestDatabase();
    process.env.RESEND_API_KEY = "re_test";
    await db`truncate users, scan_history restart identity cascade`;
    const [ana] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('user_a', 'ana@x.test', 'customer') returning id`;
    await db`insert into customer_profiles (user_id, first_name, last_name) values (${ana.id}, 'Ana', 'A')`;
    const [guest] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('walkin_guest', 'walkin-guest@clawholics.local', 'customer') returning id`;
    const [s] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Gel', 800, 500, 'tiered') returning id`;
    const [n] = await db<{ id: number }[]>`insert into nailists (name, category_id) values ('Maxine', 1) returning id`;

    const appt = async (key: string, user: number, date: string, time: string, status: string, walkinEmail: string | null = null) => {
      const [r] = await db<{ id: number }[]>`
        insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status, walkin_email)
        values (${user}, ${s.id}, 'Gel', ${n.id}, 'Maxine', ${date}, ${time}, ${status}, ${walkinEmail}) returning id`;
      ids[key] = r.id;
    };
    await appt("client", ana.id, TOMORROW, "10:00-11:00", "CONFIRMED"); // reminded
    await appt("walkinWithEmail", guest.id, TOMORROW, "11:00-12:00", "CONFIRMED", "bea@x.test"); // reminded at their own address
    await appt("walkinNoEmail", guest.id, TOMORROW, "12:00-13:00", "CONFIRMED"); // the guest's address has no inbox
    await appt("cancelled", ana.id, TOMORROW, "13:00-14:00", "CANCELLED");
    await appt("pending", ana.id, TOMORROW, "14:00-15:00", "PENDING");
    await appt("dayAfter", ana.id, "2098-06-16", "10:00-11:00", "CONFIRMED");
    await appt("today", ana.id, "2098-06-14", "15:00-16:00", "CONFIRMED");

    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("api.resend.com")) {
        sent.push(JSON.parse(String(init?.body)));
        return Response.json({ data: [] });
      }
      return Response.json({});
    }));
    reminders = await import("../../server/reminders");
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("emails tomorrow's confirmed bookings that have an inbox, once", async () => {
    const result = await reminders.sendAppointmentReminders(RUN);
    expect(result).toEqual({ date: TOMORROW, enabled: true, due: 2, emailed: 2 });
    expect(sent).toHaveLength(1);
    expect(sent[0].map((e) => e.to).sort()).toEqual(["ana@x.test", "bea@x.test"]);
    expect(await reminded("client")).not.toBeNull();
    expect(await reminded("walkinWithEmail")).not.toBeNull();
    for (const key of ["walkinNoEmail", "cancelled", "pending", "dayAfter", "today"]) expect(await reminded(key)).toBeNull();
  });

  it("sends nothing more when it runs again", async () => {
    const before = sent.length;
    expect(await reminders.sendAppointmentReminders(RUN)).toEqual({ date: TOMORROW, enabled: true, due: 0, emailed: 0 });
    expect(sent).toHaveLength(before);
  });

  it("puts the bookings back for the next run when Resend refuses the batch", async () => {
    await db`update appointments set reminder_sent_at = null`;
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "quota" }, { status: 429 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = await reminders.sendAppointmentReminders(RUN);
    expect(failed).toMatchObject({ due: 2, emailed: 0 });
    expect(await reminded("client")).toBeNull();
    expect(await reminded("walkinWithEmail")).toBeNull();
  });

  it("does nothing when the salon turned reminders off", async () => {
    await db`insert into site_settings (key, value) values ('booking_reminders_enabled', '0') on conflict (key) do update set value = '0'`;
    expect(await reminders.sendAppointmentReminders(RUN)).toEqual({ date: TOMORROW, enabled: false, due: 0, emailed: 0 });
    expect(await reminded("client")).toBeNull();
    await db`delete from site_settings where key = 'booking_reminders_enabled'`;
  });
});
