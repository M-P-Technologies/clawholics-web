// @vitest-environment node
// Integration tests for birthday vouchers against a throwaway Postgres (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: async () => ({ users: { getUser: vi.fn(async () => null) } }),
}));
vi.mock("next/server", () => ({ after: () => {} }));

const as = (clerkId: string | null) => authMock.mockResolvedValue({ userId: clerkId });

// Resend's batch endpoint
const resend = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ data: [] }), { status: 200 }));
const sentTo = () => resend.mock.calls.flatMap(([, init]) => (JSON.parse(String(init.body)) as { to: string }[]).map((e) => e.to));

// 2026-10-14 10:00 in Manila
const OCT_14 = new Date("2026-10-14T02:00:00Z");

describe.skipIf(!TEST_DATABASE_URL)("birthday vouchers (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let vouchers: typeof import("../../server/birthdayVouchers");
  let handlers: typeof import("../../server/handlers/birthdayVouchers");

  beforeAll(async () => {
    db = await resetTestDatabase();
    await db`truncate users, scan_history restart identity cascade`;
    const client = async (clerkId: string, dob: string | null, role = "customer") => {
      const [{ id }] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values (${clerkId}, ${`${clerkId}@x.test`}, ${role}) returning id`;
      await db`insert into customer_profiles (user_id, first_name, last_name, dob) values (${id}, ${clerkId}, 'X', ${dob})`;
    };
    await client("user_oct", "1999-10-30");
    await client("user_nov", "1999-11-02");
    await client("user_nodob", null);
    await client("user_oddob", "10/30/1999");
    await client("user_admin", "1990-10-01", "admin");
    process.env.RESEND_API_KEY = "re_test";
    process.env.CRON_SECRET = "s3cret";
    vi.stubGlobal("fetch", resend);
    vouchers = await import("../../server/birthdayVouchers");
    handlers = await import("../../server/handlers/birthdayVouchers");
  });

  beforeEach(() => resend.mockClear());

  afterAll(async () => {
    vi.unstubAllGlobals();
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("works out Manila's month, near midnight too", () => {
    expect(vouchers.manilaMonth(new Date("2026-09-30T16:00:00Z"))).toMatchObject({ today: "2026-10-01", month: "10", lastDay: "2026-10-31" });
    expect(vouchers.manilaMonth(new Date("2028-02-10T00:00:00Z")).lastDay).toBe("2028-02-29");
  });

  it("issues and emails one voucher to each client born this month, once", async () => {
    const first = await vouchers.issueBirthdayVouchers(OCT_14);
    expect(first).toMatchObject({ date: "2026-10-14", issued: 1, emailed: 1 });
    expect(sentTo()).toEqual(["user_oct@x.test"]);
    const [row] = await db`select year, discount_pct, valid_from, valid_until, status, emailed_at from birthday_vouchers`;
    expect(row).toMatchObject({ year: 2026, discount_pct: 20, valid_from: "2026-10-01", valid_until: "2026-10-31", status: "ISSUED" });
    expect(row.emailed_at).not.toBeNull();

    resend.mockClear();
    expect(await vouchers.issueBirthdayVouchers(OCT_14)).toMatchObject({ issued: 0, emailed: 0 });
    expect(resend).not.toHaveBeenCalled();
  });

  it("keeps them for the next run when Resend refuses or has no key", async () => {
    await db`update customer_profiles set dob = '2001-10-05' where first_name = 'user_nov'`;
    resend.mockResolvedValueOnce(new Response(JSON.stringify({ message: "rate limited" }), { status: 429 }));
    expect(await vouchers.issueBirthdayVouchers(OCT_14)).toMatchObject({ issued: 1, emailed: 0 });
    expect(await vouchers.issueBirthdayVouchers(OCT_14)).toMatchObject({ issued: 0, emailed: 1 });
    expect(sentTo().at(-1)).toBe("user_nov@x.test");

    await db`update birthday_vouchers set emailed_at = null`;
    delete process.env.RESEND_API_KEY;
    expect(await vouchers.issueBirthdayVouchers(OCT_14)).toMatchObject({ emailed: 0 });
    expect((await db`select 1 from birthday_vouchers where emailed_at is null`).length).toBe(2);
    process.env.RESEND_API_KEY = "re_test";
    expect(await vouchers.issueBirthdayVouchers(OCT_14)).toMatchObject({ emailed: 2 });
  });

  it("lets the client see and claim theirs during the month", async () => {
    as("user_nodob");
    expect((await callRoute(handlers.getMyBirthdayVoucher, "/api/vouchers/birthday")).body).toBeNull();
    expect((await callRoute(handlers.claimMyBirthdayVoucher, "/api/vouchers/birthday/claim", { method: "POST" })).status).toBe(404);

    as("user_oct");
    const mine = await callRoute(handlers.getMyBirthdayVoucher, "/api/vouchers/birthday");
    expect(mine.body).toMatchObject({ status: "ISSUED", discount_pct: 20 });
    expect(mine.body.code).toMatch(/^BDAY-[0-9A-F]{10}$/);

    const claimed = await callRoute(handlers.claimMyBirthdayVoucher, "/api/vouchers/birthday/claim", { method: "POST" });
    expect(claimed.status).toBe(200);
    expect(claimed.body).toMatchObject({ status: "CLAIMED", code: mine.body.code });
    // Claiming again is harmless
    expect((await callRoute(handlers.claimMyBirthdayVoucher, "/api/vouchers/birthday/claim", { method: "POST" })).body.claimed_at).toBe(claimed.body.claimed_at);

    as(null);
    expect((await callRoute(handlers.getMyBirthdayVoucher, "/api/vouchers/birthday")).status).toBe(401);
  });

  it("gives admins none, even one promoted after it was issued", async () => {
    await db`update users set role = 'admin' where clerk_id = 'user_nov'`;
    as("user_nov");
    expect((await callRoute(handlers.getMyBirthdayVoucher, "/api/vouchers/birthday")).body).toBeNull();
    expect((await callRoute(handlers.claimMyBirthdayVoucher, "/api/vouchers/birthday/claim", { method: "POST" })).status).toBe(404);
    await db`update users set role = 'customer' where clerk_id = 'user_nov'`;
  });

  it("expires vouchers after their month", async () => {
    const userId = (await db<{ id: number }[]>`select id from users where clerk_id = 'user_nov'`)[0].id;
    expect(await vouchers.claimVoucher(userId, new Date("2026-11-01T02:00:00Z"))).toBe("not-claimable");
    expect((await vouchers.getCurrentVoucher(userId, new Date("2026-11-01T02:00:00Z")))?.status).toBe("EXPIRED");
    expect((await vouchers.issueBirthdayVouchers(new Date("2026-11-01T02:00:00Z"))).expired).toBe(2);
  });

  it("only runs the cron with Vercel's secret", async () => {
    const cron = (authorization?: string) =>
      handlers.runBirthdayVoucherCron(
        new Request("http://localhost/api/cron/birthday-vouchers", { headers: authorization ? { authorization } : {} }),
      );
    expect((await cron()).status).toBe(401);
    expect((await cron("Bearer wrong")).status).toBe(401);
    expect((await cron("Bearer s3cret")).status).toBe(200);
  });
});
