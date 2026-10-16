// @vitest-environment node
// Integration tests for the payment screenshot reminder against a throwaway Postgres (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, resetTestDatabase } from "./testDatabase";

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: null }),
  clerkClient: async () => ({ users: { getUser: vi.fn(async () => null) } }),
}));
vi.mock("next/server", () => ({ after: () => {} }));

// Resend's batch endpoint
const resend = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
const sentTo = () => resend.mock.calls.flatMap(([, init]) => (JSON.parse(String(init.body)) as { to: string }[]).map((e) => e.to));

const NOW = new Date("2026-10-16T02:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString().slice(0, 19).replace("T", " ");

describe.skipIf(!TEST_DATABASE_URL)("payment screenshot reminders (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let reminders: typeof import("../../server/screenshotReminders");
  let userId: number;
  let n = 0;

  // A booking paid online `paidHoursAgo` hours ago, waiting for the salon
  const paidBooking = async (paidHoursAgo: number, status = "AWAITING_CONFIRMATION") => {
    const [{ id }] = await db<{ id: number }[]>`
      insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status)
      values (${userId}, 1, 'Gel Manicure', 1, 'Maxine', ${`2099-02-${String(++n).padStart(2, "0")}`}, '13:00-15:00', ${status}) returning id`;
    await db`insert into payments (id, appointment_id, amount, status, payment_method, external_id, created_at)
             values (${crypto.randomUUID()}, ${id}, 500, 'PAID', 'QRPH', ${`x-${id}`}, ${hoursAgo(paidHoursAgo)})`;
    return id;
  };

  beforeAll(async () => {
    db = await resetTestDatabase();
    await db`truncate users restart identity cascade`;
    [{ id: userId }] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('user_a', 'ana@x.test', 'customer') returning id`;
    await db`insert into customer_profiles (user_id, first_name, last_name) values (${userId}, 'Ana', 'A')`;
    process.env.RESEND_API_KEY = "re_test";
    vi.stubGlobal("fetch", resend);
    reminders = await import("../../server/screenshotReminders");
  });

  beforeEach(async () => {
    resend.mockClear();
    await db`delete from payment_proofs`;
    await db`delete from payments`;
    await db`delete from appointments`;
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("reminds a booking awaiting confirmation with no screenshot 12h after payment, once", async () => {
    const id = await paidBooking(13);
    expect(await reminders.sendDueScreenshotReminders(NOW)).toEqual({ sent: 1 });
    expect(sentTo()).toEqual(["ana@x.test"]);
    expect((await db`select screenshot_reminder_sent_at from appointments where id = ${id}`)[0].screenshot_reminder_sent_at).not.toBeNull();
    expect(await reminders.sendDueScreenshotReminders(NOW)).toEqual({ sent: 0 });
  });

  it("does not remind before 12 hours, when a screenshot was sent, or once confirmed", async () => {
    await paidBooking(11);
    const withProof = await paidBooking(13);
    await db`insert into payment_proofs (appointment_id, user_id, image_url) values (${withProof}, ${userId}, 'x')`;
    await paidBooking(13, "CONFIRMED");
    expect(await reminders.sendDueScreenshotReminders(NOW)).toEqual({ sent: 0 });
  });

  it("reminds again a booking whose latest screenshot was rejected", async () => {
    const id = await paidBooking(13);
    await db`insert into payment_proofs (appointment_id, user_id, image_url, status) values (${id}, ${userId}, 'x', 'REJECTED')`;
    expect(await reminders.sendDueScreenshotReminders(NOW)).toEqual({ sent: 1 });
  });

  it("clears the mark when Resend refuses, so the next run retries", async () => {
    const id = await paidBooking(13);
    resend.mockResolvedValueOnce(new Response(JSON.stringify({ message: "no" }), { status: 500 }));
    expect(await reminders.sendDueScreenshotReminders(NOW)).toEqual({ sent: 0 });
    expect((await db`select screenshot_reminder_sent_at from appointments where id = ${id}`)[0].screenshot_reminder_sent_at).toBeNull();
    expect(await reminders.sendDueScreenshotReminders(NOW)).toEqual({ sent: 1 });
  });

  it("the cron route refuses without the secret", async () => {
    const { runScreenshotReminderCron } = await import("../../server/handlers/screenshotReminders");
    process.env.CRON_SECRET = "s3cret";
    expect((await runScreenshotReminderCron(new Request("http://x/api/cron/screenshot-reminders"))).status).toBe(401);
    expect((await runScreenshotReminderCron(new Request("http://x", { headers: { authorization: "Bearer wrong" } }))).status).toBe(401);
  });
});
