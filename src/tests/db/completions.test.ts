// @vitest-environment node
// Integration tests for completing a visit against a throwaway Postgres (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: async () => ({ users: { getUser: vi.fn(async () => null) } }),
}));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: () => {} }));
const putObject = vi.fn(async () => {});
vi.mock("../../server/r2", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  putObject: () => putObject(),
  publicBaseUrl: () => "https://images.test",
}));

const as = (clerkId: string | null) => authMock.mockResolvedValue({ userId: clerkId });
// A real WEBP signature: uploads check the first bytes
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, ...new Array(88).fill(0)]);

describe.skipIf(!TEST_DATABASE_URL)("completing a visit (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let completions: typeof import("../../server/handlers/completions");
  let booking: typeof import("../../server/handlers/booking");
  let clients: typeof import("../../server/handlers/clients");
  let ana: number, maxine: number, jun: number, gel: number;
  let n = 0;

  const appt = async (status: string, date = `2026-01-${String(++n).padStart(2, "0")}`) => {
    const [{ id }] = await db<{ id: number }[]>`
      insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status)
      values (${ana}, ${gel}, 'Gel Manicure', ${maxine}, 'Maxine', ${date}, '13:00-15:00', ${status}) returning id`;
    return id;
  };
  const form = (fields: Record<string, string>, files: File[] = []) => {
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.set(k, v);
    for (const file of files) body.append("file", file);
    return body;
  };
  const photos = (count: number) => Array.from({ length: count }, (_, i) => new File([WEBP], `nails-${i}.webp`, { type: "image/webp" }));
  const complete = (id: number, fields: Record<string, string>, count = 0) => {
    as("user_admin");
    return callRoute(completions.saveCompletion, `/api/appointments/${id}/completion`, { method: "PUT", body: form(fields, photos(count)), params: { id: String(id) } });
  };
  const galleryOf = (nailistId: number) => db<{ image_url: string; position: number }[]>`
    select image_url, position from nailist_gallery where nailist_id = ${nailistId} order by position asc limit 10`;
  const clientRow = async (id: number) => {
    as("user_admin");
    const res = await callRoute(clients.getClient, "/x", { params: { id: String(ana) } });
    return res.body.appointments.find((a: { id: number }) => a.id === id);
  };

  beforeAll(async () => {
    db = await resetTestDatabase();
    await db`truncate users restart identity cascade`;
    await db`insert into users (clerk_id, email, role) values ('user_admin', 'admin@x.test', 'admin')`;
    [{ id: ana }] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('user_ana', 'ana@x.test', 'customer') returning id`;
    await db`insert into customer_profiles (user_id, first_name, last_name) values (${ana}, 'Ana', 'Cruz')`;
    [{ id: gel }] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Gel Manicure', 1500, 1200, 'tiered') returning id`;
    [{ id: maxine }] = await db<{ id: number }[]>`insert into nailists (name, category_id) values ('Maxine', 1) returning id`;
    [{ id: jun }] = await db<{ id: number }[]>`insert into nailists (name, category_id) values ('Jun', 2) returning id`;
    completions = await import("../../server/handlers/completions");
    booking = await import("../../server/handlers/booking");
    clients = await import("../../server/handlers/clients");
  });

  afterAll(async () => {
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("completing a confirmed visit saves the record, marks it completed and adds the photos to the chosen artist's gallery", async () => {
    const id = await appt("CONFIRMED");
    const saved = await complete(id, { balance_amount: "1300", payment_method: "GCash", nailist_id: String(jun) }, 2);
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ completion: { appointment_id: id, balance_amount: 1300, payment_method: "GCash", nailist_id: jun }, photos: 2 });
    expect((await db`select status from appointments where id = ${id}`)[0].status).toBe("COMPLETED");
    expect((await galleryOf(jun)).map((g) => g.image_url)).toEqual([
      expect.stringMatching(/^https:\/\/images\.test\/nailists\/.*\.webp$/),
      expect.stringMatching(/^https:\/\/images\.test\/nailists\/.*\.webp$/),
    ]);
  });

  it("saving a completion again updates it", async () => {
    const id = await appt("CONFIRMED");
    await complete(id, { balance_amount: "1000", payment_method: "Cash", nailist_id: String(maxine) }, 1);
    const before = (await galleryOf(maxine)).length;
    const again = await complete(id, { balance_amount: "1100", payment_method: "Card", nailist_id: String(maxine) });
    expect(again.status).toBe(200);
    expect(await db`select balance_amount, payment_method from visit_completions where appointment_id = ${id}`).toEqual([
      { balance_amount: 1100, payment_method: "Card" },
    ]);
    expect((await galleryOf(maxine)).length).toBe(before);
  });

  it("completion photos go first even when the gallery is full", async () => {
    await db`delete from nailist_gallery where nailist_id = ${maxine}`;
    for (let i = 1; i <= 10; i++) await db`insert into nailist_gallery (nailist_id, image_url, position) values (${maxine}, ${`https://old/${i}.webp`}, ${i})`;
    const id = await appt("CONFIRMED");
    expect((await complete(id, { balance_amount: "0", payment_method: "Cash", nailist_id: String(maxine) }, 1)).status).toBe(200);
    const shown = await galleryOf(maxine);
    expect(shown).toHaveLength(10);
    expect(shown[0].image_url).toMatch(/^https:\/\/images\.test\//);
    // The gallery keeps 10, so the admin's editor (which shows 10) still sees and manages every photo
    expect(await db`select image_url from nailist_gallery where nailist_id = ${maxine}`).toHaveLength(10);
    expect(await db`select 1 from nailist_gallery where image_url = 'https://old/10.webp'`).toHaveLength(0);
  });

  it("doesn't complete a visit cancelled while its photos were uploading", async () => {
    const id = await appt("CONFIRMED");
    putObject.mockImplementationOnce(async () => {
      await db`update appointments set status = 'CANCELLED' where id = ${id}`;
    });
    const res = await complete(id, { balance_amount: "0", payment_method: "Cash", nailist_id: String(maxine) }, 1);
    expect(res.status).toBe(409);
    expect((await db`select status from appointments where id = ${id}`)[0].status).toBe("CANCELLED");
    expect(await db`select 1 from visit_completions where appointment_id = ${id}`).toHaveLength(0);
  });

  it("refused for a pending booking (409), before the visit date (400), with bad fields (400), and for clients (403)", async () => {
    const fields = { balance_amount: "500", payment_method: "Cash", nailist_id: String(maxine) };
    expect((await complete(await appt("PENDING"), fields)).status).toBe(409);
    expect((await complete(await appt("CONFIRMED", "2099-05-01"), fields)).status).toBe(400);
    const id = await appt("CONFIRMED");
    expect((await complete(id, { ...fields, balance_amount: "-1" })).status).toBe(400);
    expect((await complete(id, { ...fields, balance_amount: "1.5" })).status).toBe(400);
    expect((await complete(id, { ...fields, payment_method: "Bitcoin" })).status).toBe(400);
    expect((await complete(id, { ...fields, nailist_id: "999999" })).status).toBe(400);
    expect((await complete(id, fields, 7)).status).toBe(400);
    as("user_ana");
    expect((await callRoute(completions.saveCompletion, "/x", { method: "PUT", body: form(fields), params: { id: String(id) } })).status).toBe(403);
    expect((await db`select status from appointments where id = ${id}`)[0].status).toBe("CONFIRMED");
  });

  it("refuses a file that isn't a real image, and saves nothing", async () => {
    const id = await appt("CONFIRMED");
    const fake = new File([new Uint8Array(50)], "x.webp", { type: "image/webp" });
    as("user_admin");
    const res = await callRoute(completions.saveCompletion, "/x", {
      method: "PUT",
      body: form({ balance_amount: "0", payment_method: "Cash", nailist_id: String(maxine) }, [fake]),
      params: { id: String(id) },
    });
    expect(res.status).toBe(400);
    expect((await db`select status from appointments where id = ${id}`)[0].status).toBe("CONFIRMED");
  });

  it("leaving COMPLETED deletes the completion", async () => {
    const id = await appt("CONFIRMED");
    await complete(id, { balance_amount: "1000", payment_method: "Cash", nailist_id: String(maxine) });
    as("user_admin");
    const res = await callRoute(booking.updateAppointmentStatus, "/x", { method: "PATCH", body: { status: "CONFIRMED" }, params: { id: String(id) } });
    expect(res.status).toBe(200);
    expect(await db`select 1 from visit_completions where appointment_id = ${id}`).toHaveLength(0);
  });

  it("GET /clients/:id carries completion, paid_downpayment, expected_balance and proof_image_url", async () => {
    const id = await appt("CONFIRMED");
    await db`insert into payments (id, appointment_id, amount, status, payment_method, external_id) values (${crypto.randomUUID()}, ${id}, 500, 'PAID', 'QRPH', ${`x-${id}`})`;
    await db`insert into payment_proofs (appointment_id, user_id, image_url, status) values (${id}, ${ana}, 'https://images.test/payment-proofs/p.png', 'APPROVED')`;
    expect(await clientRow(id)).toMatchObject({
      completion: null, paid_downpayment: 500, expected_balance: 1100, proof_image_url: "https://images.test/payment-proofs/p.png", nailist_id: maxine,
    });

    await complete(id, { balance_amount: "1300", payment_method: "Maya", nailist_id: String(jun) });
    expect((await clientRow(id)).completion).toEqual({ balance_amount: 1300, payment_method: "Maya", nailist_id: jun, nailist_name: "Jun", arrived_at: null, late_fee: 0, photos_added: 0, photo_url: null, voucher_code: null, voucher_discount: 0 });
  });

  it("records when the client arrived and the late fee the terms set", async () => {
    const id = await appt("CONFIRMED");
    const saved = await complete(id, { balance_amount: "1200", payment_method: "Cash", nailist_id: String(maxine), arrived_at: "13:17" });
    expect(saved.status).toBe(200);
    expect(await db`select arrived_at, late_fee from visit_completions where appointment_id = ${id}`).toEqual([{ arrived_at: "13:17", late_fee: 100 }]);
    expect((await complete(id, { balance_amount: "1200", payment_method: "Cash", nailist_id: String(maxine), arrived_at: "25:00" })).status).toBe(400);
    expect((await complete(id, { balance_amount: "1100", payment_method: "Cash", nailist_id: String(maxine), arrived_at: "" })).status).toBe(200);
    expect(await db`select arrived_at, late_fee from visit_completions where appointment_id = ${id}`).toEqual([{ arrived_at: null, late_fee: 0 }]);
  });

  it("photos can come later: a completion without them is a visit with photos to add, until some are added", async () => {
    const { buildDashboard } = await import("../../server/dashboard");
    const id = await appt("CONFIRMED");
    const before = (await buildDashboard("month")).attention.photosToAdd;
    await complete(id, { balance_amount: "0", payment_method: "Cash", nailist_id: String(maxine) });
    expect((await buildDashboard("month")).attention.photosToAdd).toBe(before + 1);
    as("user_admin");
    const list = await callRoute(booking.listAllAppointments, "/api/booking/appointments?page=1&pageSize=50&complete=photos");
    expect(list.body.rows.map((r: { id: number }) => r.id)).toContain(id);

    await complete(id, { balance_amount: "0", payment_method: "Cash", nailist_id: String(maxine) }, 2);
    expect(await db`select photos_added from visit_completions where appointment_id = ${id}`).toEqual([{ photos_added: 2 }]);
    expect((await buildDashboard("month")).attention.photosToAdd).toBe(before);
  });

  it("marks a confirmed visit as a no-show (the downpayment is kept), and counts it on the client page", async () => {
    const id = await appt("CONFIRMED");
    const pending = await appt("PENDING");
    as("user_admin");
    const patch = (appointmentId: number) =>
      callRoute(booking.updateAppointmentStatus, "/x", { method: "PATCH", body: { status: "NO_SHOW" }, params: { id: String(appointmentId) } });
    expect((await patch(id)).status).toBe(200);
    expect((await db`select status from appointments where id = ${id}`)[0].status).toBe("NO_SHOW");
    const refused = await patch(pending);
    expect(refused.status).toBe(409);
    expect(refused.body.code).toBe("NOT_CONFIRMED");
    as("user_admin");
    const page = await callRoute(clients.getClient, "/x", { params: { id: String(ana) } });
    expect(page.body.summary.noShows).toBeGreaterThanOrEqual(1);
  });

  it("adds the visit's one photo later, to its record and the artist's gallery; a new one replaces it", async () => {
    const id = await appt("CONFIRMED");
    await complete(id, { balance_amount: "0", payment_method: "Cash", nailist_id: String(jun) });
    const upload = (file: File, who = "user_admin") => {
      as(who);
      const body = new FormData();
      body.set("file", file);
      return callRoute(completions.saveVisitPhoto, `/api/appointments/${id}/photo`, { method: "PUT", body, params: { id: String(id) } });
    };
    const first = await upload(photos(1)[0]);
    expect(first.status).toBe(200);
    const [after1] = await db<{ photo_url: string; photos_added: number }[]>`select photo_url, photos_added from visit_completions where appointment_id = ${id}`;
    expect(after1.photos_added).toBe(1);
    expect((await galleryOf(jun))[0].image_url).toBe(after1.photo_url);

    expect((await upload(photos(1)[0])).status).toBe(200);
    const [after2] = await db<{ photo_url: string }[]>`select photo_url from visit_completions where appointment_id = ${id}`;
    expect(after2.photo_url).not.toBe(after1.photo_url);
    const urls = (await galleryOf(jun)).map((g) => g.image_url);
    expect(urls).toContain(after2.photo_url);
    expect(urls).not.toContain(after1.photo_url);

    expect((await upload(new File([new Uint8Array(50)], "x.webp", { type: "image/webp" }))).status).toBe(400);
    expect((await upload(new File([WEBP, new Uint8Array(1024 * 1024)], "big.webp", { type: "image/webp" }))).status).toBe(400);
    expect((await upload(photos(1)[0], "user_ana")).status).toBe(403);
  });

  it("only takes a photo for a visit completed with its form", async () => {
    const id = await appt("CONFIRMED");
    as("user_admin");
    const body = new FormData();
    body.set("file", photos(1)[0]);
    expect((await callRoute(completions.saveVisitPhoto, "/x", { method: "PUT", body, params: { id: String(id) } })).status).toBe(409);
  });

  describe("birthday vouchers at the salon", () => {
    let bea: number;
    const voucher = async (userId: number, code: string, status = "CLAIMED") => {
      await db`
        insert into birthday_vouchers (user_id, year, code, discount_pct, valid_from, valid_until, status, claimed_at)
        values (${userId}, 2026, ${code}, 20, '2026-03-01', '2026-03-31', ${status}, '2026-03-01 08:00:00')`;
    };
    const voucherRow = async (code: string) =>
      (await db<{ status: string; appointment_id: number | null; used_at: string | null }[]>`
        select status, appointment_id, used_at from birthday_vouchers where code = ${code}`)[0];
    const check = (code: string, appointmentId: number) => {
      as("user_admin");
      return callRoute(vouchersHandlers.checkVoucher, `/api/vouchers/check?code=${encodeURIComponent(code)}&appointment_id=${appointmentId}`);
    };
    const fields = { balance_amount: "500", payment_method: "Cash", nailist_id: "" };
    let vouchersHandlers: typeof import("../../server/handlers/birthdayVouchers");

    beforeAll(async () => {
      [{ id: bea }] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('user_bea', 'bea@x.test', 'customer') returning id`;
      await db`insert into customer_profiles (user_id, first_name, last_name) values (${bea}, 'Bea', 'Lim')`;
      await voucher(ana, "BDAY-ANA0000001");
      await voucher(bea, "BDAY-BEA0000001");
      vouchersHandlers = await import("../../server/handlers/birthdayVouchers");
      fields.nailist_id = String(maxine);
    });

    it("checks a code: the client's own, for a visit in its month, 20% of the menu price", async () => {
      const id = await appt("CONFIRMED", "2026-03-10");
      const price = (await clientRow(id)).price as number;
      const ok = await check("bday-ana0000001 ", id);
      expect(ok.status).toBe(200);
      expect(ok.body).toMatchObject({ code: "BDAY-ANA0000001", discount_pct: 20, discount: Math.round(price * 0.2) });
      expect((await check("BDAY-BEA0000001", id)).body.message).toMatch(/isn't this client's/);
      expect((await check("BDAY-NOPE", id)).body.message).toMatch(/No birthday voucher/);
      expect((await check("BDAY-ANA0000001", await appt("CONFIRMED", "2026-04-02"))).body.message).toMatch(/only for visits from Mar 1, 2026/);
      as("user_ana");
      expect((await callRoute(vouchersHandlers.checkVoucher, `/x?code=BDAY-ANA0000001&appointment_id=${id}`)).status).toBe(403);
    });

    it("completing with the code marks it USED by the visit, once; saving without it frees it again", async () => {
      const id = await appt("CONFIRMED", "2026-03-11");
      const price = (await clientRow(id)).price as number;
      const saved = await complete(id, { ...fields, voucher_code: "BDAY-ANA0000001" });
      expect(saved.status).toBe(200);
      expect(saved.body.completion).toMatchObject({ voucher_code: "BDAY-ANA0000001", voucher_discount: Math.round(price * 0.2) });
      expect(await voucherRow("BDAY-ANA0000001")).toMatchObject({ status: "USED", appointment_id: id });
      expect((await clientRow(id)).completion).toMatchObject({ voucher_code: "BDAY-ANA0000001", voucher_discount: Math.round(price * 0.2) });

      // Not on a second visit
      const other = await appt("CONFIRMED", "2026-03-12");
      const refused = await complete(other, { ...fields, voucher_code: "BDAY-ANA0000001" });
      expect(refused.status).toBe(400);
      expect(refused.body.message).toMatch(/already used on another visit/);
      expect((await db`select status from appointments where id = ${other}`)[0].status).toBe("CONFIRMED");

      // Saved again without it, still in March: back to claimed, and the visit has no discount
      vi.useFakeTimers({ now: new Date("2026-03-15T02:00:00Z"), toFake: ["Date"] });
      try {
        expect((await complete(id, fields)).status).toBe(200);
      } finally {
        vi.useRealTimers();
      }
      expect(await voucherRow("BDAY-ANA0000001")).toMatchObject({ status: "CLAIMED", appointment_id: null, used_at: null });
      expect((await db`select voucher_discount from visit_completions where appointment_id = ${id}`)[0].voucher_discount).toBe(0);
    });

    it("moving a visit off COMPLETED frees its voucher; a lapsed one goes back to EXPIRED", async () => {
      await db`update birthday_vouchers set status = 'EXPIRED' where code = 'BDAY-BEA0000001'`;
      const [{ id }] = await db<{ id: number }[]>`
        insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status)
        values (${bea}, ${gel}, 'Gel Manicure', ${maxine}, 'Maxine', '2026-03-20', '13:00-15:00', 'CONFIRMED') returning id`;
      // Expired since, but the visit was in its month
      expect((await complete(id, { ...fields, voucher_code: "BDAY-BEA0000001" })).status).toBe(200);
      expect(await voucherRow("BDAY-BEA0000001")).toMatchObject({ status: "USED", appointment_id: id });
      as("user_admin");
      const res = await callRoute(booking.updateAppointmentStatus, "/x", { method: "PATCH", body: { status: "CONFIRMED" }, params: { id: String(id) } });
      expect(res.status).toBe(200);
      expect(await voucherRow("BDAY-BEA0000001")).toMatchObject({ status: "EXPIRED", appointment_id: null });
    });

    it("GET /clients/:id shows the voucher and the visit it was used on", async () => {
      const id = await appt("CONFIRMED", "2026-03-13");
      expect((await complete(id, { ...fields, voucher_code: "BDAY-ANA0000001" })).status).toBe(200);
      as("user_admin");
      vi.useFakeTimers({ now: new Date("2026-03-15T02:00:00Z"), toFake: ["Date"] });
      try {
        const res = await callRoute(clients.getClient, "/x", { params: { id: String(ana) } });
        expect(res.body.birthday_voucher).toMatchObject({ code: "BDAY-ANA0000001", status: "USED", used_on: "2026-03-13" });
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
