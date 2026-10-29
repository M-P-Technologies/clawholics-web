import "server-only";
import { cancelExpiredPendingAppointments, getAppointment, isSlotConflict } from "../appointments";
import { slotTaken } from "../slotRules";
import { canAccess, requireAdmin, requireUserRow, type RequesterUser } from "../auth";
import { getSql } from "../db";
import { sendAppointmentConfirmation } from "../email";
import { notifyAdmins } from "../notifications";
import { inBackground, readJson, routeNotFound, toId } from "../http";
import {
  MAX_PROOF_SIZE,
  PROOF_EXTENSIONS,
  createXenditInvoice,
  expirePendingXenditInvoices,
  getPaymentSettings,
  isValidXenditCallback,
  validatePaymentSettings,
  XenditInvoiceError,
  closeOpenXenditInvoices,
} from "../payments";
import { imageBytes, NOT_AN_IMAGE } from "../imageFiles";
import { publicBaseUrl, putObject } from "../r2";
import { ported } from "../worker";

// Payment routes, ported from worker-api/src/index.ts (~lines 2024-2240). Bodies, status codes
// and messages match the Worker; access comes from the Clerk-verified session, and the Xendit
// webhook must carry the account's callback token.

type IdContext = { params: Promise<{ id: string }> };

class AppointmentNotAwaitingPayment extends Error {}

const errorBody = (message: string, status: number) => Response.json({ error: message, message }, { status });

// POST /payment/create (owner of the appointment): a Xendit invoice for the downpayment.
export const createPayment = ported(async (req) => {
  const requester = await requireUserRow();
  if (requester instanceof Response) return requester;

  const { appointment_id, payment_method } = await readJson<{ appointment_id?: unknown; payment_method?: string }>(req);
  const { downpayment_amount, payment_methods } = await getPaymentSettings();
  if (payment_method === "MANUAL") return errorBody("Manual payments are made by uploading a payment proof.", 400);
  if (!payment_method || !payment_methods.includes(payment_method)) return errorBody("This payment method is not available.", 400);

  const sql = getSql();
  const appointmentId = toId(appointment_id);
  await cancelExpiredPendingAppointments();
  const [appt] = appointmentId === null
    ? []
    : await sql<{ status: string | null; user_id: number; expires_at: string | null }[]>`
        select status, user_id, expires_at from appointments where id = ${appointmentId}`;
  if (!appt) return errorBody("Appointment not found.", 404);
  if (!canAccess(requester, appt.user_id)) return errorBody("You can only pay for your own appointment.", 403);
  const apptStatus = String(appt.status || "").trim().toUpperCase();
  if (["CONFIRMED", "COMPLETED", "PAID"].includes(apptStatus)) {
    return errorBody("This appointment has already been paid for.", 400);
  }
  // Only a booking still holding its slot is paid for: an expired or cancelled one has let it go
  if (apptStatus !== "PENDING") return errorBody("This booking has expired. Please book your time again.", 409);
  // The invoice closes when the hold ends, so a payment can't arrive for a slot already released
  const holdSeconds = Math.floor((Date.parse(appt.expires_at ?? "") - Date.now()) / 1000);
  if (!(holdSeconds > 0)) return errorBody("This booking has expired. Please book your time again.", 409);

  // One payment path at a time: a proof under review blocks a new Xendit invoice
  const [pendingProof] = await sql`select id from payment_proofs where appointment_id = ${appointmentId} and status = 'PENDING' limit 1`;
  if (pendingProof) return errorBody("A payment proof for this appointment is awaiting review.", 409);

  // Reuse an open invoice for the same channel. Switching channels expires the open invoices
  // first, so only one invoice for the appointment can be paid.
  const open = await sql<{ invoice_url: string | null; external_id: string; payment_method: string | null }[]>`
    select invoice_url, external_id, payment_method from payments
    where appointment_id = ${appointmentId} and upper(status) = 'PENDING'
    order by created_at desc
  `;
  const [existing] = open;
  if (existing?.invoice_url && existing.payment_method === payment_method) {
    return Response.json({ invoice_url: existing.invoice_url, external_id: existing.external_id });
  }
  if (open.length > 0) {
    let closed: "paid" | "closed";
    try {
      closed = await closeOpenXenditInvoices(open.map((p) => p.external_id));
    } catch (error) {
      console.error(`[payment] could not close the open invoices of appointment ${appointmentId}:`, error);
      return errorBody("This payment method is not available right now. Please choose another one.", 502);
    }
    if (closed === "paid") {
      return errorBody("Your earlier payment was received and is being confirmed. Please check My Schedule in a moment.", 409);
    }
    await sql`update payments set status = 'FAILED' where appointment_id = ${appointmentId} and upper(status) = 'PENDING'`;
  }

  const externalId = `appt-${appointmentId}-${Date.now()}`;
  let invoiceUrl: string;
  try {
    invoiceUrl = await createXenditInvoice(appointmentId!, externalId, downpayment_amount, payment_method, holdSeconds);
  } catch (error) {
    if (!(error instanceof XenditInvoiceError)) throw error;
    return errorBody("This payment method is not available right now. Please choose another one.", 502);
  }
  await sql`
    insert into payments (id, appointment_id, amount, status, payment_method, external_id, invoice_url)
    values (${crypto.randomUUID()}, ${appointmentId}, ${downpayment_amount}, 'PENDING', ${payment_method}, ${externalId}, ${invoiceUrl})
  `;
  return Response.json({ invoice_url: invoiceUrl, external_id: externalId });
});

// POST /payment/webhook (Xendit): a PAID invoice confirms its appointment. Requests without
// the matching x-callback-token are refused (the Worker accepted any caller).
export const xenditWebhook = ported(
  async (req) => {
    if (!isValidXenditCallback(req)) return Response.json({ error: "Invalid callback token" }, { status: 401 });

    const body = await readJson<{ status?: string; external_id?: string; externalId?: string }>(req);
    const externalId = body.external_id || body.externalId;
    if (body.status === "PAID" && externalId) {
      const outcome = await getSql().begin(async (tx) => {
        // Only a payment not yet recorded as paid: Xendit repeats a callback it isn't sure arrived,
        // and the repeat must change nothing. An appointment already paid by an approved payment
        // proof is skipped too, so it isn't paid twice.
        const [paid] = await tx<{ appointment_id: number }[]>`
          update payments set status = 'PAID', paid_at = coalesce(paid_at, clawholics_utc_now())
          where external_id = ${externalId} and upper(status) <> 'PAID'
            and not exists (
              select 1 from payments p2
              where p2.appointment_id = payments.appointment_id and p2.payment_method = 'MANUAL' and upper(p2.status) = 'PAID'
            )
          returning appointment_id
        `;
        if (!paid) return null;
        const appointmentId = paid.appointment_id;
        // The payment is recorded either way, and a paid booking is confirmed. Only a booking
        // waiting for this payment moves: unpaid, or released when its hold ran out just before the
        // payment arrived (and its time is still free). Anything else (already paid another way, confirmed, completed, refunded),
        // or a slot someone else took meanwhile, keeps its status for an admin to check.
        const [appt] = await tx<{ status: string; expires_at: string | null; nailist_id: number; appointment_date: string; appointment_time: string }[]>`
          select status, expires_at, nailist_id, appointment_date, appointment_time from appointments where id = ${appointmentId} for update
        `;
        const status = String(appt?.status ?? "").trim().toUpperCase();
        // A cancellation by the client or an admin clears expires_at: only a hold that ran out comes back
        const released = status === "CANCELLED" && appt.expires_at !== null;
        if (status !== "PENDING" && !released) return { appointmentId, applied: false };
        if (released && (await slotTaken(appt.nailist_id, appt.appointment_date, appt.appointment_time, appointmentId))) {
          return { appointmentId, applied: false };
        }
        try {
          await tx.savepoint((sp) => sp`update appointments set status = 'CONFIRMED' where id = ${appointmentId}`);
          return { appointmentId, applied: true };
        } catch (error) {
          if (!isSlotConflict(error)) throw error;
          return { appointmentId, applied: false };
        }
      });
      if (outcome?.applied) {
        const paidId = outcome.appointmentId;
        inBackground("appointment confirmation email", () => sendAppointmentConfirmation(paidId));
        // The admins' bell. After the payment's transaction, so a failure here can't undo it
        inBackground("admin notification", () => notifyAdmins("booking_paid", paidId, paidId));
      } else if (outcome) {
        const { appointmentId } = outcome;
        console.error(`[webhook] appointment ${appointmentId} was paid but can't take the payment; an admin needs to check it`);
        inBackground("admin notification", () => notifyAdmins("payment_to_check", appointmentId, appointmentId));
      }
    }
    return new Response("OK", { status: 200 });
  },
  { requireOrigin: false },
);

// GET /payment/details/:id (owner or admin)
export const getPaymentDetails = ported<IdContext>(async (_req, { params }) => {
  const requester = await requireUserRow();
  if (requester instanceof Response) return requester;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  await cancelExpiredPendingAppointments();
  const appt = await getAppointment(id);
  if (!appt) return routeNotFound();
  if (!canAccess(requester, appt.user_id)) return Response.json({ error: "Forbidden" }, { status: 403 });
  return Response.json(appt);
});

// GET /settings/payment (public): what the payment page offers.
export const getPaymentSettingsRoute = ported(async () => Response.json(await getPaymentSettings()));

// PUT /settings/payment (admin)
export const updatePaymentSettings = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<{ downpayment_amount?: number; payment_methods?: string[] }>(req);
  const validationError = validatePaymentSettings(body);
  if (validationError) return errorBody(validationError, 400);

  await getSql().begin(async (tx) => {
    for (const [key, value] of [
      ["downpayment_amount", String(body.downpayment_amount)],
      ["payment_methods", JSON.stringify(body.payment_methods)],
    ]) {
      await tx`
        insert into site_settings (key, value, updated_at) values (${key}, ${value}, clawholics_utc_now())
        on conflict (key) do update set value = excluded.value, updated_at = clawholics_utc_now()
      `;
    }
  });
  return Response.json(await getPaymentSettings());
});

// Proof routes answer 401 with the Worker's wording when there's no session or users row
async function requireProofUser(): Promise<(RequesterUser & { id: number }) | Response> {
  const requester = await requireUserRow();
  if (requester instanceof Response || requester.id === null) {
    return Response.json({ error: "Unauthenticated: Please log in." }, { status: 401 });
  }
  return requester as RequesterUser & { id: number };
}

// POST /payment/proofs (the client who booked): upload a manual payment proof.
export const uploadPaymentProof = ported(async (req) => {
  const requester = await requireProofUser();
  if (requester instanceof Response) return requester;

  const formData = await req.formData();
  const file = formData.get("file");
  const appointmentId = toId(formData.get("appointment_id"));
  if (!file || typeof file === "string") return Response.json({ error: "No image uploaded." }, { status: 400 });
  if (appointmentId === null) return Response.json({ error: "A valid appointment_id is required." }, { status: 400 });

  const ext = PROOF_EXTENSIONS[file.type];
  if (!ext) return Response.json({ error: "Only JPG, PNG, and WEBP files are allowed." }, { status: 400 });
  if (file.size > MAX_PROOF_SIZE) return Response.json({ error: "Image must be 1MB or smaller." }, { status: 400 });
  const bytes = await imageBytes(file);
  if (!bytes) return Response.json({ error: NOT_AN_IMAGE }, { status: 400 });

  await cancelExpiredPendingAppointments();
  const appt = await getAppointment(appointmentId);
  if (!appt) return Response.json({ error: "Appointment not found." }, { status: 404 });
  // Only the client who booked can upload a proof for it
  if (appt.user_id !== requester.id) {
    return Response.json({ error: "You can only upload a proof for your own appointment." }, { status: 403 });
  }

  // Paid by proof: a PENDING booking, while MANUAL is on
  const apptStatus = String(appt.status || "").toUpperCase();
  if (apptStatus !== "PENDING") return Response.json({ error: "This appointment is not awaiting payment." }, { status: 400 });
  const { payment_methods } = await getPaymentSettings();
  if (!payment_methods.includes("MANUAL")) return Response.json({ error: "Manual payment is not available." }, { status: 400 });

  const sql = getSql();
  const [pendingProof] = await sql`select id from payment_proofs where appointment_id = ${appointmentId} and status = 'PENDING' limit 1`;
  if (pendingProof) return Response.json({ error: "A payment proof for this appointment is already awaiting review." }, { status: 409 });

  // Random key so the public URL can't be guessed; the extension comes from the checked MIME type
  const key = `payment-proofs/${crypto.randomUUID()}.${ext}`;
  const imageUrl = `${publicBaseUrl()}/${key}`;
  await putObject(key, bytes, file.type);

  const [proof] = await sql<{ id: number }[]>`
    insert into payment_proofs (appointment_id, user_id, image_url) values (${appointmentId}, ${requester.id}, ${imageUrl})
    returning *
  `;
  inBackground("admin notification", () => notifyAdmins("proof_uploaded", proof.id, appointmentId));
  return Response.json(proof, { status: 201 });
});

// GET /payment/proofs[?appointment_id=|?status=]: an appointment's proofs (owner or admin), or
// every proof (admin).
export const listPaymentProofs = ported(async (req) => {
  const requester = await requireProofUser();
  if (requester instanceof Response) return requester;
  const isAdmin = requester.role === "admin";
  const params = new URL(req.url).searchParams;
  const sql = getSql();

  const appointmentParam = params.get("appointment_id");
  if (appointmentParam === null) {
    if (!isAdmin) return Response.json({ error: "Forbidden: Admin access required." }, { status: 403 });
    const status = params.get("status")?.toUpperCase() || null;
    return Response.json(await sql`
      select pp.*, u.email, cp.first_name, cp.last_name,
        a.service_name, a.nailist_name, a.appointment_date, a.appointment_time, a.status as appointment_status
      from payment_proofs pp
      join appointments a on pp.appointment_id = a.id
      join users u on pp.user_id = u.id
      left join customer_profiles cp on cp.user_id = u.id
      ${status ? sql`where pp.status = ${status}` : sql``}
      order by pp.created_at desc, pp.id desc
    `);
  }

  const appointmentId = toId(appointmentParam);
  const [appt] = appointmentId === null ? [] : await sql<{ user_id: number }[]>`select user_id from appointments where id = ${appointmentId}`;
  if (!appt) return Response.json({ error: "Appointment not found." }, { status: 404 });
  if (appt.user_id !== requester.id && !isAdmin) return Response.json({ error: "Unauthorized access to payment proofs." }, { status: 403 });
  return Response.json(await sql`
    select * from payment_proofs where appointment_id = ${appointmentId} order by created_at desc, id desc
  `);
});

// PUT /payment/proofs/:id/review (admin): approve (confirms the appointment as paid) or reject.
export const reviewPaymentProof = ported<IdContext>(async (req, { params }) => {
  // requireAdmin provisions a Clerk-only admin's users row, like the other admin routes;
  // the row's id is recorded as reviewed_by.
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof Response) return adminCheck;
  const admin = await requireUserRow();
  if (admin instanceof Response || admin.id === null) {
    return Response.json({ error: "Forbidden: Admin access required." }, { status: 403 });
  }

  const proofId = toId((await params).id);
  const body = await readJson<{ status?: string; admin_note?: unknown }>(req);
  const status = body.status;
  const adminNote = typeof body.admin_note === "string" && body.admin_note.trim() ? body.admin_note.trim() : null;
  if (status !== "APPROVED" && status !== "REJECTED") return Response.json({ error: "status must be APPROVED or REJECTED." }, { status: 400 });

  const sql = getSql();
  const [proof] = proofId === null ? [] : await sql<{ id: number; appointment_id: number; status: string }[]>`
    select * from payment_proofs where id = ${proofId}
  `;
  if (!proof) return Response.json({ error: "Payment proof not found." }, { status: 404 });
  if (proof.status !== "PENDING") return Response.json({ error: "This payment proof has already been reviewed." }, { status: 409 });

  if (status === "APPROVED") {
    const [appt] = await sql<{ status: string | null }[]>`select status from appointments where id = ${proof.appointment_id}`;
    if (String(appt?.status || "").toUpperCase() !== "PENDING") {
      return Response.json({ error: "The appointment is no longer awaiting payment." }, { status: 409 });
    }
  }

  const { downpayment_amount } = await getPaymentSettings();
  // One transaction: the review, and on approval the confirmed appointment and manual payment.
  // The review only moves a PENDING proof and approval only confirms a still-PENDING
  // appointment, so two admins (or a client cancelling) racing the review can't both win.
  const outcome = await sql.begin(async (tx) => {
    const [reviewed] = await tx`
      update payment_proofs set status = ${status}, admin_note = ${adminNote}, reviewed_by = ${admin.id}, updated_at = clawholics_utc_now()
      where id = ${proof.id} and status = 'PENDING'
      returning id
    `;
    if (!reviewed) return "already-reviewed" as const;
    if (status !== "APPROVED") return [] as string[];

    const [confirmed] = await tx`
      update appointments set status = 'CONFIRMED'
      where id = ${proof.appointment_id} and upper(status) = 'PENDING' returning id
    `;
    // Rolls the review back too
    if (!confirmed) throw new AppointmentNotAwaitingPayment();

    const openPayments = await tx<{ external_id: string }[]>`
      select external_id from payments where appointment_id = ${proof.appointment_id} and upper(status) = 'PENDING'
    `;
    await tx`update payments set status = 'FAILED' where appointment_id = ${proof.appointment_id} and upper(status) = 'PENDING'`;
    await tx`
      insert into payments (id, appointment_id, amount, status, payment_method, external_id, invoice_url, paid_at)
      values (${crypto.randomUUID()}, ${proof.appointment_id}, ${downpayment_amount}, 'PAID', 'MANUAL', ${`proof-${proof.id}`}, null, clawholics_utc_now())
    `;
    return openPayments.map((p) => p.external_id);
  }).catch((error) => {
    if (error instanceof AppointmentNotAwaitingPayment) return "not-awaiting-payment" as const;
    throw error;
  });
  if (outcome === "already-reviewed") return Response.json({ error: "This payment proof has already been reviewed." }, { status: 409 });
  if (outcome === "not-awaiting-payment") {
    return Response.json({ error: "The appointment is no longer awaiting payment." }, { status: 409 });
  }

  if (status === "APPROVED") {
    inBackground("payment proof approval follow-up", () =>
      Promise.all([expirePendingXenditInvoices(outcome), sendAppointmentConfirmation(proof.appointment_id)]),
    );
  }
  const [updated] = await sql`select * from payment_proofs where id = ${proof.id}`;
  return Response.json(updated);
});
