// @vitest-environment node
// Integration tests for the ported booking and payment routes against a throwaway Postgres
// (`npm run test:db`). Xendit and Resend aren't configured here, so invoices use the
// Worker's placeholder URL and emails are skipped; R2 is mocked.
import type postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock(), clerkClient: async () => ({ users: { getUser: async () => null } }) }));

// Background work (emails) runs right away and is awaited by the tests
const background: Promise<unknown>[] = [];
vi.mock("next/server", () => ({ after: (fn: () => Promise<unknown>) => background.push(fn()) }));

const putObject = vi.fn();
vi.mock("../../server/r2", () => ({ putObject: (...args: unknown[]) => putObject(...args), publicBaseUrl: () => "https://images.test" }));

const as = (clerkId: string | null) => authMock.mockResolvedValue({ userId: clerkId });

describe.skipIf(!TEST_DATABASE_URL)("booking and payment routes (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let booking: typeof import("../../server/handlers/booking");
  let payments: typeof import("../../server/handlers/payments");
  let clientA: number;
  let clientB: number;
  let serviceId: number;
  let nailistId: number;
  let nailistName: string;
  let serviceName: string;

  // Far-future dates: refunds/changes are only allowed 72+ hours ahead
  let day = 0;
  const nextDate = () => `2099-01-${String(++day).padStart(2, "0")}`;

  const book = (clerkId: string, date: string, time = "10:00 AM", extra: object = {}) => {
    as(clerkId);
    return callRoute(booking.createBooking, "/api/booking/create", {
      method: "POST",
      body: { service_id: serviceId, service_name: serviceName, nailist_id: nailistId, nailist_name: nailistName, appointment_date: date, appointment_time: time, ...extra },
    });
  };
  const statusOf = async (id: number) => (await db<{ status: string }[]>`select status from appointments where id = ${id}`)[0]?.status;

  beforeAll(async () => {
    db = await resetTestDatabase();
    process.env.XENDIT_CALLBACK_TOKEN = "cb-token";
    delete process.env.XENDIT_SECRET_KEY;
    delete process.env.RESEND_API_KEY;

    const [a] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('user_a', 'a@x.test', 'customer') returning id`;
    const [b] = await db<{ id: number }[]>`insert into users (clerk_id, email, role) values ('user_b', 'b@x.test', 'customer') returning id`;
    await db`insert into users (clerk_id, email, role) values ('user_admin', 'admin@x.test', 'admin')`;
    await db`insert into customer_profiles (user_id, first_name, last_name, phone, dob) values (${a.id}, 'Ana', 'A', '0917', '2000-01-01'), (${b.id}, 'Bea', 'B', '0918', '2000-01-01')`;
    clientA = a.id;
    clientB = b.id;

    const [pair] = await db<{ nailist_id: number; service_id: number; nailist_name: string; service_name: string }[]>`
      select ns.nailist_id, ns.service_id, n.name as nailist_name, s.name as service_name
      from nailist_services ns join nailists n on n.id = ns.nailist_id join services s on s.id = ns.service_id
      where s.is_active = 1 order by ns.service_id, ns.nailist_id limit 1
    `;
    ({ nailist_id: nailistId, service_id: serviceId, nailist_name: nailistName, service_name: serviceName } = pair);

    booking = await import("../../server/handlers/booking");
    payments = await import("../../server/handlers/payments");
  });

  beforeEach(async () => {
    // Each test starts with no open bookings for the two clients
    await db`update appointments set status = 'CANCELLED' where upper(status) = 'PENDING'`;
    background.length = 0;
  });

  afterAll(async () => {
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  describe("booking", () => {
    it("TC-BK-01: books for the signed-in client, ignoring user_id in the body", async () => {
      const res = await book("user_a", nextDate(), "10:00 AM", { user_id: clientB });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: "PENDING" });
      const [row] = await db`select user_id, status from appointments where id = ${res.body.appointment_id}`;
      expect(row).toEqual({ user_id: clientA, status: "PENDING" });
    });

    it("TC-BK-02: needs a session", async () => {
      as(null);
      const res = await callRoute(booking.createBooking, "/api/booking/create", { method: "POST", body: {} });
      expect(res.status).toBe(401);
    });

    it("TC-BK-03: one unpaid booking per client, and one active booking per slot", async () => {
      const date = nextDate();
      expect((await book("user_a", date)).status).toBe(200);
      const again = await book("user_a", nextDate());
      expect(again.status).toBe(409);
      expect(again.body.code).toBe("PENDING_APPOINTMENT_EXISTS");
      const taken = await book("user_b", date);
      expect(taken.status).toBe(409);
      expect(taken.body.message).toBe("Time slot already booked");
    });

    it("TC-BK-04: two clients racing for one slot: exactly one wins (unique index)", async () => {
      const date = nextDate();
      authMock.mockResolvedValueOnce({ userId: "user_a" }).mockResolvedValueOnce({ userId: "user_b" });
      const body = (extra: object) => ({ method: "POST", body: { service_id: serviceId, service_name: serviceName, nailist_id: nailistId, nailist_name: nailistName, appointment_date: date, appointment_time: "2:00 PM", ...extra } });
      const results = await Promise.all([
        callRoute(booking.createBooking, "/api/booking/create", body({})),
        callRoute(booking.createBooking, "/api/booking/create", body({})),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    });

    it("TC-BK-05: an appointment is visible to its owner and admins only", async () => {
      const { body } = await book("user_a", nextDate());
      const id = body.appointment_id;
      as("user_b");
      expect((await callRoute(booking.getAppointmentById, `/api/booking/appointments/${id}`, { params: { id: String(id) } })).status).toBe(403);
      as(null);
      expect((await callRoute(booking.getAppointmentById, `/api/booking/appointments/${id}`, { params: { id: String(id) } })).status).toBe(401);
      as("user_a");
      const own = await callRoute(booking.getAppointmentById, `/api/booking/appointments/${id}`, { params: { id: String(id) } });
      expect(own.status).toBe(200);
      expect(own.body).toMatchObject({ id, user_id: clientA, client_name: "Ana A", email: "a@x.test", service_price: expect.any(Number) });
      as("user_admin");
      expect((await callRoute(booking.getAppointmentById, `/api/booking/appointments/${id}`, { params: { id: String(id) } })).status).toBe(200);
    });

    it("TC-BK-06: listing all appointments, status changes and the schedule are admin-only", async () => {
      as("user_a");
      expect((await callRoute(booking.listAllAppointments, "/api/booking/appointments")).status).toBe(403);
      expect((await callRoute(booking.getSchedule, "/api/booking/schedule?month=2099-01")).status).toBe(403);
      as("user_admin");
      const list = await callRoute(booking.listAllAppointments, "/api/booking/appointments?status=pending,confirmed");
      expect(list.status).toBe(200);
      expect(Array.isArray(list.body)).toBe(true);
      const schedule = await callRoute(booking.getSchedule, "/api/booking/schedule?month=2099-01");
      expect(Object.keys(schedule.body)).toEqual(["nailists", "appointments", "dayOffs", "timeSlots"]);
      expect(schedule.body.timeSlots[0].start_time).toMatch(/^\d{2}:\d{2}$/);
    });

    it("TC-BK-07: expired unpaid bookings are cancelled lazily (unless a proof is under review)", async () => {
      const { body } = await book("user_a", nextDate());
      await db`update appointments set expires_at = '2000-01-01T00:00:00.000Z' where id = ${body.appointment_id}`;
      await db`insert into payments (id, appointment_id, amount, status, payment_method, external_id) values ('p-exp', ${body.appointment_id}, 500, 'PENDING', 'GCASH', 'ext-exp')`;
      as("user_a");
      await callRoute(booking.getAppointmentById, `/api/booking/appointments/${body.appointment_id}`, { params: { id: String(body.appointment_id) } });
      expect(await statusOf(body.appointment_id)).toBe("CANCELLED");
      expect((await db`select status from payments where id = 'p-exp'`)[0].status).toBe("FAILED");
    });

    it("TC-BK-08: booked slots are public and list only active bookings' times", async () => {
      const date = nextDate();
      await book("user_a", date, "3:00 PM");
      as(null);
      const res = await callRoute(booking.getBookedSlots, `/api/booking/slots-detailed?nailist_id=${nailistId}&date=${date}`);
      expect(res.body).toEqual([{ appointment_time: "3:00 PM" }]);
      expect((await callRoute(booking.getBookedSlots, "/api/booking/slots-detailed?nailist_id=abc&date=x")).body).toEqual([]);
    });

    it("TC-BK-08c: the admin list answers one page, filtered, searched and sorted, with the total", async () => {
      // Two days, three appointments: A at 9 and 2, B at 11 on the next day (confirmed between
      // bookings: a client holds one unpaid booking at a time)
      const day1 = nextDate();
      const day2 = nextDate();
      const { body: a1 } = await book("user_a", day1, "14:00-15:00");
      await db`update appointments set status = 'CONFIRMED' where id = ${a1.appointment_id}`;
      const { body: a2 } = await book("user_a", day1, "09:00-10:00");
      await db`update appointments set status = 'COMPLETED' where id = ${a2.appointment_id}`;
      const { body: b1 } = await book("user_b", day2, "11:00-12:00");
      await db`update appointments set status = 'AWAITING_PROOF' where id = ${b1.appointment_id}`;
      await db`insert into payment_proofs (appointment_id, user_id, image_url, status) values (${b1.appointment_id}, ${clientB}, 'https://img/p.jpg', 'PENDING')`;

      const list = (query: string) => callRoute(booking.listAllAppointments, `/api/booking/appointments?${query}`);
      const ids = (body: { rows: { id: number }[] }) => body.rows.map((r) => r.id);

      as("user_admin");
      // The two days, soonest first, two to a page
      const first = await list(`page=1&pageSize=2&from=${day1}&sort=upcoming`);
      expect(first.status).toBe(200);
      expect(first.body).toMatchObject({ total: 3, page: 1, pageSize: 2 });
      expect(ids(first.body)).toEqual([a2.appointment_id, a1.appointment_id]);
      expect(ids((await list(`page=2&pageSize=2&from=${day1}&sort=upcoming`)).body)).toEqual([b1.appointment_id]);
      expect(ids((await list(`page=1&pageSize=5&from=${day1}&sort=latest`)).body)).toEqual([b1.appointment_id, a1.appointment_id, a2.appointment_id]);

      // Filters: statuses, one day, the proof to review, the search
      expect(ids((await list(`page=1&from=${day1}&status=CONFIRMED,COMPLETED`)).body).sort()).toEqual([a1.appointment_id, a2.appointment_id].sort());
      expect((await list(`page=1&on=${day2}`)).body.total).toBe(1);
      const proofs = await list(`page=1&from=${day1}&proof=review`);
      expect(ids(proofs.body)).toEqual([b1.appointment_id]);
      expect(proofs.body.rows[0].latest_proof).toMatchObject({ status: "PENDING", image_url: "https://img/p.jpg" });
      expect((await list(`page=1&from=${day1}&q=bea`)).body.total).toBe(1);
      expect(ids((await list(`page=1&q=%23${a1.appointment_id}`)).body)).toContain(a1.appointment_id);
      // A search for a LIKE wildcard matches only that character, not everything
      expect((await list(`page=1&from=${day1}&q=%25`)).body.total).toBe(0);

      // Each row carries its client's completed visits
      const ana = (await list(`page=1&on=${day1}`)).body.rows[0];
      expect(ana.client_visits).toBeGreaterThanOrEqual(1);

      // Times are ordered by their padded start: "9:00-10:00" comes before "13:00-14:00"
      const day3 = nextDate();
      await db`update appointments set appointment_date = ${day3}, appointment_time = '13:00-14:00' where id = ${a1.appointment_id}`;
      await db`update appointments set appointment_date = ${day3}, appointment_time = '9:00-10:00' where id = ${a2.appointment_id}`;
      expect(ids((await list(`page=1&on=${day3}&sort=upcoming`)).body)).toEqual([a2.appointment_id, a1.appointment_id]);
      expect(ids((await list(`page=1&on=${day3}&sort=latest`)).body)).toEqual([a1.appointment_id, a2.appointment_id]);

      // Without page, the full list as before; an empty status list means no status filter
      expect(Array.isArray((await list("status=CONFIRMED")).body)).toBe(true);
      const blank = await list("status=%2C");
      expect(blank.status).toBe(200);
      expect(Array.isArray(blank.body)).toBe(true);

      // Bad paging or sort is refused, and only admins may list
      for (const bad of ["page=0", "page=1&pageSize=51", "page=1&sort=price", "page=1&on=tomorrow"]) {
        expect((await list(bad)).status).toBe(400);
      }
      as("user_a");
      expect((await list("page=1")).status).toBe(403);
    });

    it("TC-BK-08b: a range of days' booked slots come in one answer, active bookings only", async () => {
      const first = nextDate();
      const second = nextDate();
      const outside = nextDate();
      // A client holds one unpaid booking at a time, so each is confirmed before the next
      await book("user_a", first, "3:00 PM");
      await db`update appointments set status = 'CONFIRMED' where user_id = ${clientA} and appointment_date = ${first}`;
      await book("user_b", second, "9:00 AM");
      await db`update appointments set status = 'CONFIRMED' where user_id = ${clientB} and appointment_date = ${second}`;
      await book("user_b", outside, "9:00 AM");
      const { body: cancelled } = await book("user_a", second, "1:00 PM");
      expect(cancelled.appointment_id).toBeDefined();
      await db`update appointments set status = 'CANCELLED' where id = ${cancelled.appointment_id}`;

      as(null);
      const url = (query: string) => `/api/booking/slots-range?${query}`;
      const res = await callRoute(booking.getBookedSlotsRange, url(`nailist_id=${nailistId}&from=${first}&to=${second}`));
      expect(res.status).toBe(200);
      expect(res.body).toEqual([
        { appointment_date: first, appointment_time: "3:00 PM" },
        { appointment_date: second, appointment_time: "9:00 AM" },
      ]);

      for (const bad of [
        `nailist_id=abc&from=${first}&to=${second}`,
        `nailist_id=${nailistId}&from=${second}&to=${first}`,
        `nailist_id=${nailistId}&from=2099-01-01&to=2099-06-01`,
        `nailist_id=${nailistId}&from=x&to=${second}`,
      ]) {
        expect((await callRoute(booking.getBookedSlotsRange, url(bad))).status).toBe(400);
      }
    });

    it("TC-BK-09: reschedule is owner-only and refuses a taken slot", async () => {
      const takenDate = nextDate();
      await book("user_b", takenDate, "11:00 AM");
      await db`update appointments set status = 'CONFIRMED' where user_id = ${clientB} and appointment_date = ${takenDate}`;
      const { body } = await book("user_a", nextDate());
      const params = { id: String(body.appointment_id) };

      as("user_b");
      expect((await callRoute(booking.rescheduleAppointment, "/x", { method: "POST", body: { newDate: nextDate(), newTime: "9:00 AM" }, params })).status).toBe(403);
      as("user_a");
      const clash = await callRoute(booking.rescheduleAppointment, "/x", { method: "POST", body: { newDate: takenDate, newTime: "11:00 AM" }, params });
      expect(clash.status).toBe(409);
      const ok = await callRoute(booking.rescheduleAppointment, "/x", { method: "POST", body: { newDate: "2099-02-01", newTime: "9:00 AM" }, params });
      expect(ok.status).toBe(200);
      expect(ok.body.appointment).toMatchObject({ appointment_date: "2099-02-01", appointment_time: "9:00 AM" });
    });
  });

  describe("payments", () => {
    it("TC-PAY-01: only the owner can start a payment; an open invoice is reused", async () => {
      const { body } = await book("user_a", nextDate());
      as("user_b");
      expect((await callRoute(payments.createPayment, "/api/payment/create", { method: "POST", body: { appointment_id: body.appointment_id, payment_method: "GCASH" } })).status).toBe(403);
      as("user_a");
      const first = await callRoute(payments.createPayment, "/api/payment/create", { method: "POST", body: { appointment_id: body.appointment_id, payment_method: "GCASH" } });
      expect(first.status).toBe(200);
      expect(first.body.invoice_url).toBe(`https://checkout.xendit.co/v2/placeholder-${body.appointment_id}`);
      const second = await callRoute(payments.createPayment, "/api/payment/create", { method: "POST", body: { appointment_id: body.appointment_id, payment_method: "GCASH" } });
      expect(second.body.external_id).toBe(first.body.external_id);
      expect((await callRoute(payments.createPayment, "/api/payment/create", { method: "POST", body: { appointment_id: body.appointment_id, payment_method: "MANUAL" } })).status).toBe(400);
    });

    it("TC-PAY-01b: only enabled channels are invoiced, and a channel Xendit refuses records nothing", async () => {
      const { body } = await book("user_a", nextDate());
      as("user_a");
      const pay = (payment_method: string) =>
        callRoute(payments.createPayment, "/api/payment/create", { method: "POST", body: { appointment_id: body.appointment_id, payment_method } });

      expect((await pay("QRPH")).status).toBe(400);

      await db`update site_settings set value = '["GCASH","QRPH","CREDIT_CARD"]' where key = 'payment_methods'`;
      process.env.XENDIT_SECRET_KEY = "xnd_development_test";
      // A fake Xendit: CREDIT_CARD isn't activated; invoices are listed with `invoiceStatus`
      let invoiceStatus = "PENDING";
      const created: string[] = [];
      const expired: string[] = [];
      const xendit = vi.fn(async (url: string, init: RequestInit = {}) => {
        if (url.includes("/expire!")) {
          expired.push(url);
          return Response.json({});
        }
        if (url.includes("?external_id=")) return Response.json([{ id: "inv-1", status: invoiceStatus }]);
        const { payment_methods } = JSON.parse(String(init.body));
        if (payment_methods[0] === "CREDIT_CARD") {
          return Response.json({ error_code: "UNAVAILABLE_PAYMENT_METHOD_ERROR", message: "Channel not activated" }, { status: 400 });
        }
        created.push(payment_methods[0]);
        return Response.json({ invoice_url: `https://checkout-staging.xendit.co/web/${payment_methods[0]}` });
      });
      vi.stubGlobal("fetch", xendit);
      const rows = () => db`select payment_method, status from payments where appointment_id = ${body.appointment_id} order by created_at`;
      try {
        const refused = await pay("CREDIT_CARD");
        expect(refused.status).toBe(502);
        expect(refused.body.error).toMatch(/payment method is not available/);
        expect(await rows()).toHaveLength(0);

        const qrph = await pay("QRPH");
        expect(qrph.status).toBe(200);
        expect(qrph.body.invoice_url).toBe("https://checkout-staging.xendit.co/web/QRPH");
        expect(JSON.parse(String(xendit.mock.calls[1][1]!.body))).toMatchObject({ payment_methods: ["QRPH"], currency: "PHP" });

        // Same channel again: the open invoice is reused
        expect((await pay("QRPH")).body.external_id).toBe(qrph.body.external_id);
        expect(created).toEqual(["QRPH"]);

        // Another channel: the open QR Ph invoice is expired first
        const gcash = await pay("GCASH");
        expect(gcash.body.invoice_url).toBe("https://checkout-staging.xendit.co/web/GCASH");
        expect(expired).toHaveLength(1);
        expect(await rows()).toEqual([{ payment_method: "QRPH", status: "FAILED" }, { payment_method: "GCASH", status: "PENDING" }]);

        // Already paid but not yet confirmed: no second invoice
        invoiceStatus = "PAID";
        const paid = await pay("QRPH");
        expect(paid.status).toBe(409);
        expect(paid.body.error).toMatch(/being confirmed/);
        expect(created).toEqual(["QRPH", "GCASH"]);
      } finally {
        vi.unstubAllGlobals();
        delete process.env.XENDIT_SECRET_KEY;
        await db`update site_settings set value = '["GCASH"]' where key = 'payment_methods'`;
      }
    });

    const webhook = (token: string | null, body: object) =>
      payments.xenditWebhook(
        new Request("http://localhost/api/payment/webhook", {
          method: "POST",
          headers: { "content-type": "application/json", ...(token ? { "x-callback-token": token } : {}) },
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({}) } as never,
      );

    it("TC-PAY-02: the webhook needs Xendit's callback token, then confirms the paid booking", async () => {
      const { body } = await book("user_a", nextDate());
      as("user_a");
      const invoice = await callRoute(payments.createPayment, "/api/payment/create", { method: "POST", body: { appointment_id: body.appointment_id, payment_method: "GCASH" } });

      expect((await webhook(null, { external_id: invoice.body.external_id, status: "PAID" })).status).toBe(401);
      expect((await webhook("wrong", { external_id: invoice.body.external_id, status: "PAID" })).status).toBe(401);
      expect(await statusOf(body.appointment_id)).toBe("PENDING");

      const ok = await webhook("cb-token", { external_id: invoice.body.external_id, status: "PAID" });
      expect(ok.status).toBe(200);
      expect(await ok.text()).toBe("OK");
      expect(await statusOf(body.appointment_id)).toBe("CONFIRMED");
      await Promise.all(background);
    });

    it("TC-PAY-03: the webhook refuses everything when XENDIT_CALLBACK_TOKEN isn't set", async () => {
      delete process.env.XENDIT_CALLBACK_TOKEN;
      try {
        expect((await webhook("cb-token", { external_id: "x", status: "PAID" })).status).toBe(401);
      } finally {
        process.env.XENDIT_CALLBACK_TOKEN = "cb-token";
      }
    });

    const proofForm = (appointmentId: number) => {
      const form = new FormData();
      form.set("file", new File([new Uint8Array(100)], "proof.png", { type: "image/png" }));
      form.set("appointment_id", String(appointmentId));
      return form;
    };

    it("TC-PAY-04: payment proof: owner uploads, admin approves once, Xendit then can't double-pay", async () => {
      await db`update site_settings set value = '["GCASH","MANUAL"]' where key = 'payment_methods'`;
      const { body } = await book("user_a", nextDate());
      const id = body.appointment_id;
      as("user_a");
      const invoice = await callRoute(payments.createPayment, "/api/payment/create", { method: "POST", body: { appointment_id: id, payment_method: "GCASH" } });

      as("user_b");
      expect((await callRoute(payments.uploadPaymentProof, "/api/payment/proofs", { method: "POST", body: proofForm(id) })).status).toBe(403);
      as("user_a");
      const uploaded = await callRoute(payments.uploadPaymentProof, "/api/payment/proofs", { method: "POST", body: proofForm(id) });
      expect(uploaded.status).toBe(201);
      expect(uploaded.body.image_url).toMatch(/^https:\/\/images\.test\/payment-proofs\/[0-9a-f-]{36}\.png$/);
      expect((await callRoute(payments.uploadPaymentProof, "/api/payment/proofs", { method: "POST", body: proofForm(id) })).status).toBe(409);

      as("user_a");
      expect((await callRoute(payments.listPaymentProofs, `/api/payment/proofs?appointment_id=${id}`)).body).toHaveLength(1);
      expect((await callRoute(payments.listPaymentProofs, "/api/payment/proofs")).status).toBe(403);
      expect((await callRoute(payments.reviewPaymentProof, "/x", { method: "PUT", body: { status: "APPROVED" }, params: { id: String(uploaded.body.id) } })).status).toBe(403);

      as("user_admin");
      const review = (status: string) =>
        callRoute(payments.reviewPaymentProof, "/x", { method: "PUT", body: { status, admin_note: " ok " }, params: { id: String(uploaded.body.id) } });
      const approved = await review("APPROVED");
      expect(approved.status).toBe(200);
      expect(approved.body).toMatchObject({ status: "APPROVED", admin_note: "ok" });
      expect((await review("REJECTED")).status).toBe(409);

      expect(await statusOf(id)).toBe("CONFIRMED");
      const pays = await db<{ status: string; payment_method: string }[]>`select status, payment_method from payments where appointment_id = ${id} order by payment_method`;
      expect(pays).toEqual([{ status: "FAILED", payment_method: "GCASH" }, { status: "PAID", payment_method: "MANUAL" }]);

      // A late Xendit PAID for the old invoice doesn't record a second payment
      await webhook("cb-token", { external_id: invoice.body.external_id, status: "PAID" });
      expect((await db`select status from payments where external_id = ${invoice.body.external_id}`)[0].status).toBe("FAILED");
      await Promise.all(background);
    });

    it("TC-PAY-05: refund: unpaid → CANCELLED, manual payment 72h+ ahead → REFUNDED; owner only", async () => {
      const unpaid = (await book("user_a", nextDate())).body.appointment_id;
      as("user_b");
      expect((await callRoute(booking.refundAppointment, "/x", { method: "POST", params: { id: String(unpaid) } })).status).toBe(403);
      as("user_a");
      const cancelled = await callRoute(booking.refundAppointment, "/x", { method: "POST", params: { id: String(unpaid) } });
      expect(cancelled.body).toEqual({ message: "Appointment cancelled successfully.", status: "CANCELLED" });

      const paid = (await book("user_a", nextDate())).body.appointment_id;
      await db`insert into payments (id, appointment_id, amount, status, payment_method, external_id) values ('p-man', ${paid}, 500, 'PAID', 'MANUAL', 'proof-x')`;
      await db`update appointments set status = 'CONFIRMED' where id = ${paid}`;
      const refunded = await callRoute(booking.refundAppointment, "/x", { method: "POST", params: { id: String(paid) } });
      expect(refunded.body.status).toBe("REFUNDED");
      expect((await callRoute(booking.refundAppointment, "/x", { method: "POST", params: { id: String(paid) } })).status).toBe(400);
      await Promise.all(background);
    });

    it("TC-PAY-07: a payment for an expired booking whose slot was rebooked is recorded, not confirmed", async () => {
      const date = nextDate();
      const { body } = await book("user_a", date);
      as("user_a");
      const invoice = await callRoute(payments.createPayment, "/api/payment/create", { method: "POST", body: { appointment_id: body.appointment_id, payment_method: "GCASH" } });
      // The hold expires and someone else takes the slot
      await db`update appointments set expires_at = '2000-01-01T00:00:00.000Z' where id = ${body.appointment_id}`;
      expect((await book("user_b", date)).status).toBe(200);
      await db`update payments set status = 'PENDING' where external_id = ${invoice.body.external_id}`;

      const res = await webhook("cb-token", { external_id: invoice.body.external_id, status: "PAID" });
      expect(res.status).toBe(200);
      expect((await db`select status from payments where external_id = ${invoice.body.external_id}`)[0].status).toBe("PAID");
      expect(await statusOf(body.appointment_id)).toBe("CANCELLED");
    });

    it("TC-PAY-08: approving a proof after the client cancelled is refused and changes nothing", async () => {
      await db`update site_settings set value = '["GCASH","MANUAL"]' where key = 'payment_methods'`;
      const { body } = await book("user_a", nextDate());
      as("user_a");
      const uploaded = await callRoute(payments.uploadPaymentProof, "/api/payment/proofs", { method: "POST", body: proofForm(body.appointment_id) });
      await callRoute(booking.refundAppointment, "/x", { method: "POST", params: { id: String(body.appointment_id) } });

      as("user_admin");
      const res = await callRoute(payments.reviewPaymentProof, "/x", { method: "PUT", body: { status: "APPROVED" }, params: { id: String(uploaded.body.id) } });
      expect(res.status).toBe(409);
      expect((await db`select status from payment_proofs where id = ${uploaded.body.id}`)[0].status).toBe("PENDING");
      expect(await db`select 1 from payments where appointment_id = ${body.appointment_id} and payment_method = 'MANUAL'`).toHaveLength(0);
      await Promise.all(background);
    });

    it("TC-PAY-09: two cancels at once: one wins, the other sees it already cancelled", async () => {
      const { body } = await book("user_a", nextDate());
      as("user_a");
      const params = { id: String(body.appointment_id) };
      const results = await Promise.all([
        callRoute(booking.refundAppointment, "/x", { method: "POST", params }),
        callRoute(booking.refundAppointment, "/x", { method: "POST", params }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
      await Promise.all(background);
    });

    it("TC-BK-10: re-activating a cancelled booking whose slot was taken answers 409, not 500", async () => {
      const date = nextDate();
      const { body } = await book("user_a", date);
      await db`update appointments set status = 'CANCELLED' where id = ${body.appointment_id}`;
      expect((await book("user_b", date)).status).toBe(200);
      as("user_admin");
      const res = await callRoute(booking.updateAppointmentStatus, "/x", { method: "PATCH", body: { status: "confirmed" }, params: { id: String(body.appointment_id) } });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("SLOT_TAKEN");
    });

    it("TC-PAY-06: payment settings: public read, admin-only validated update", async () => {
      as(null);
      expect((await callRoute(payments.getPaymentSettingsRoute, "/api/settings/payment")).body).toHaveProperty("downpayment_amount");
      as("user_a");
      expect((await callRoute(payments.updatePaymentSettings, "/api/settings/payment", { method: "PUT", body: { downpayment_amount: 300, payment_methods: ["GCASH"] } })).status).toBe(403);
      as("user_admin");
      expect((await callRoute(payments.updatePaymentSettings, "/api/settings/payment", { method: "PUT", body: { downpayment_amount: 0, payment_methods: ["GCASH"] } })).status).toBe(400);
      const ok = await callRoute(payments.updatePaymentSettings, "/api/settings/payment", { method: "PUT", body: { downpayment_amount: 300, payment_methods: ["GCASH", "MANUAL"] } });
      expect(ok.body).toEqual({ downpayment_amount: 300, payment_methods: ["GCASH", "MANUAL"] });
    });

    it("TC-PAY-10: a paid booking and an uploaded proof notify the admins once each; each admin marks them read", async () => {
      const notifications = await import("../../server/handlers/notifications");
      await db`delete from admin_notifications`;
      await db`insert into users (clerk_id, email, role) values ('user_admin2', 'admin2@x.test', 'admin')`;
      await db`update site_settings set value = '["GCASH","MANUAL"]' where key = 'payment_methods'`;
      try {
        // Paid online: the webhook may come twice, the admins hear once
        const paidBooking = await book("user_a", nextDate(), "9:00 AM");
        expect(paidBooking.status).toBe(200);
        as("user_a");
        const invoice = await callRoute(payments.createPayment, "/api/payment/create", {
          method: "POST",
          body: { appointment_id: paidBooking.body.appointment_id, payment_method: "GCASH" },
        });
        await webhook("cb-token", { external_id: invoice.body.external_id, status: "PAID" });
        await webhook("cb-token", { external_id: invoice.body.external_id, status: "PAID" });

        // A proof uploaded for review
        const proofBooking = await book("user_b", nextDate(), "9:00 AM");
        expect(proofBooking.status).toBe(200);
        as("user_b");
        const uploaded = await callRoute(payments.uploadPaymentProof, "/api/payment/proofs", {
          method: "POST",
          body: proofForm(proofBooking.body.appointment_id),
        });
        expect(uploaded.status).toBe(201);
        await Promise.all(background);

        // Clients can't see them
        as("user_a");
        expect((await callRoute(notifications.getAdminNotifications, "/api/notifications")).status).toBe(403);

        as("user_admin");
        const list = await callRoute(notifications.getAdminNotifications, "/api/notifications");
        expect(list.status).toBe(200);
        expect(list.body.unread).toBe(2);
        type Row = { id: number; kind: string; appointment_id: number; unread: boolean };
        expect(list.body.notifications.map((n: Row) => [n.kind, n.appointment_id, n.unread])).toEqual([
          ["proof_uploaded", proofBooking.body.appointment_id, true],
          ["booking_paid", paidBooking.body.appointment_id, true],
        ]);
        expect(list.body.notifications[1]).toMatchObject({ client_user_id: clientA, service_name: serviceName, nailist_name: nailistName });

        // Opening the bell marks them read, for this admin only
        const read = (upTo: unknown) => callRoute(notifications.markNotificationsRead, "/api/notifications/read", { method: "POST", body: { upTo } });
        expect((await read("x")).status).toBe(400);
        expect((await read(list.body.notifications[0].id)).status).toBe(200);
        const after = await callRoute(notifications.getAdminNotifications, "/api/notifications");
        expect(after.body.unread).toBe(0);
        expect(after.body.notifications.every((n: Row) => !n.unread)).toBe(true);
        // An older id doesn't mark them unread again
        expect((await read(list.body.notifications[1].id)).status).toBe(200);
        expect((await callRoute(notifications.getAdminNotifications, "/api/notifications")).body.unread).toBe(0);

        as("user_admin2");
        expect((await callRoute(notifications.getAdminNotifications, "/api/notifications")).body.unread).toBe(2);
      } finally {
        await db`update site_settings set value = '["GCASH"]' where key = 'payment_methods'`;
      }
    });
  });
});
