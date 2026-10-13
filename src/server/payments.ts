import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getSql } from "./db";

// Payment settings and Xendit helpers, ported from worker-api/src/index.ts.

// Xendit invoice channel codes (PAYMAYA = Maya, CREDIT_CARD = cards, QRPH = QR Ph). Each one
// must also be activated in the Xendit dashboard, or Xendit refuses the invoice.
// MANUAL = pay outside Xendit and upload a payment proof
const PAYMENT_METHOD_OPTIONS = ["GCASH", "PAYMAYA", "GRABPAY", "SHOPEEPAY", "CREDIT_CARD", "QRPH", "MANUAL"];
const DEFAULT_DOWNPAYMENT_AMOUNT = 500;
const DEFAULT_PAYMENT_METHODS = ["GCASH"];
const MAX_DOWNPAYMENT_AMOUNT = 100000;
export const PROOF_EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const MAX_PROOF_SIZE = 1024 * 1024;

export interface PaymentSettings {
  downpayment_amount: number;
  payment_methods: string[];
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const rows = await getSql()<{ key: string; value: string }[]>`
    select key, value from site_settings where key in ('downpayment_amount', 'payment_methods')
  `;
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const amount = Number(byKey.downpayment_amount);
  let methods = DEFAULT_PAYMENT_METHODS;
  try {
    const parsed = JSON.parse(String(byKey.payment_methods));
    if (Array.isArray(parsed)) {
      const valid = parsed.filter((m) => PAYMENT_METHOD_OPTIONS.includes(m));
      if (valid.length > 0) methods = valid;
    }
  } catch {
    // fall back to the default
  }

  return {
    downpayment_amount: Number.isInteger(amount) && amount > 0 ? amount : DEFAULT_DOWNPAYMENT_AMOUNT,
    payment_methods: methods,
  };
}

/** An error message, or null when the body is a valid payment settings update. */
export function validatePaymentSettings(body: unknown): string | null {
  const { downpayment_amount: amount, payment_methods: methods } = (body ?? {}) as Record<string, unknown>;
  if (!Number.isInteger(amount) || (amount as number) < 1 || (amount as number) > MAX_DOWNPAYMENT_AMOUNT) {
    return `downpayment_amount must be a whole number from 1 to ${MAX_DOWNPAYMENT_AMOUNT}.`;
  }
  if (!Array.isArray(methods) || methods.length === 0) return "payment_methods must be a non-empty list.";
  if (methods.some((m) => !PAYMENT_METHOD_OPTIONS.includes(m as string))) {
    return `payment_methods may only contain: ${PAYMENT_METHOD_OPTIONS.join(", ")}.`;
  }
  if (new Set(methods).size !== methods.length) return "payment_methods must not contain duplicates.";
  return null;
}

// --- Xendit ---------------------------------------------------------------------------------

const xenditAuth = () => {
  const key = process.env.XENDIT_SECRET_KEY;
  return key ? `Basic ${Buffer.from(`${key}:`).toString("base64")}` : null;
};

const frontendUrl = () => process.env.FRONTEND_URL || "https://clawholicsbymax.com";

export interface XenditInvoice {
  id?: string;
  invoice_id?: string;
  status?: string;
  amount?: number;
  payment_amount?: number;
  [key: string]: unknown;
}

export async function getXenditInvoices(externalId: string): Promise<XenditInvoice[]> {
  const auth = xenditAuth();
  if (!auth) return [];
  const res = await fetch(`https://api.xendit.co/v2/invoices?external_id=${encodeURIComponent(externalId)}`, {
    headers: { Authorization: auth },
  });
  if (!res.ok) {
    console.error("XENDIT GET INVOICES ERROR:", await res.text());
    throw new Error(`Xendit API returned ${res.status} when fetching invoices.`);
  }
  return res.json();
}

export async function expireXenditInvoice(invoiceId: string) {
  const auth = xenditAuth();
  if (!auth) return;
  await fetch(`https://api.xendit.co/invoices/${encodeURIComponent(invoiceId)}/expire!`, {
    method: "POST",
    headers: { Authorization: auth },
  });
}

/**
 * Before a client switches channel: "paid" when one of the open invoices was already paid (its
 * callback may still be on the way), otherwise expires them all. Throws when Xendit can't be
 * checked or an invoice can't be expired, so a second payable invoice is never created.
 */
export async function closeOpenXenditInvoices(externalIds: string[]): Promise<"paid" | "closed"> {
  const auth = xenditAuth();
  if (!auth) return "closed";
  const invoices = (await Promise.all(externalIds.map(getXenditInvoices))).flat();
  if (invoices.some((i) => i.status === "PAID" || i.status === "SETTLED")) return "paid";
  for (const invoice of invoices) {
    if (invoice.status !== "PENDING" || !invoice.id) continue;
    const res = await fetch(`https://api.xendit.co/invoices/${encodeURIComponent(invoice.id)}/expire!`, {
      method: "POST",
      headers: { Authorization: auth },
    });
    if (!res.ok) throw new Error(`Xendit API returned ${res.status} when expiring invoice ${invoice.id}.`);
  }
  return "closed";
}

/** Once a payment proof is approved, earlier Xendit invoices for the appointment must not be payable. */
export async function expirePendingXenditInvoices(externalIds: string[]) {
  for (const externalId of externalIds) {
    try {
      for (const invoice of await getXenditInvoices(externalId)) {
        if (invoice.status === "PENDING" && invoice.id) await expireXenditInvoice(invoice.id);
      }
    } catch (e) {
      console.error(`[XENDIT] Could not expire invoice for ${externalId}:`, e);
    }
  }
}

export async function createXenditRefund(invoice: XenditInvoice) {
  const auth = xenditAuth();
  if (!auth) throw new Error("XENDIT_SECRET_KEY missing");

  const invoiceId = invoice.id || invoice.invoice_id;
  const amount = Number(invoice.amount || invoice.payment_amount);
  if (!invoiceId) {
    console.error("CRITICAL: Invoice object is missing ID. Available keys:", Object.keys(invoice).join(", "));
    throw new Error("Could not find a valid Invoice ID for refund.");
  }

  const idempotencyKey = `refund-${invoiceId}-${Date.now()}`;
  const res = await fetch("https://api.xendit.co/refunds", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json", "Idempotency-key": idempotencyKey },
    body: JSON.stringify({
      invoice_id: invoiceId,
      amount,
      currency: "PHP",
      reason: "REQUESTED_BY_CUSTOMER",
      reference_id: idempotencyKey,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("XENDIT REFUND API ERROR:", errorBody);
    let detailedError = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      detailedError = parsed.message || parsed.error_code || errorBody;
    } catch {
      // keep the raw text
    }
    throw new Error(detailedError);
  }
  return res.json();
}

/** Xendit refused the invoice, e.g. because the channel isn't activated on the account. */
export class XenditInvoiceError extends Error {}

/**
 * A new invoice for the downpayment, or the Worker's placeholder URL when Xendit isn't configured.
 * Throws XenditInvoiceError when Xendit refuses it (the Worker sent the client to the placeholder).
 */
export async function createXenditInvoice(appointmentId: number, externalId: string, amount: number, paymentMethod: string) {
  const auth = xenditAuth();
  if (!auth) return `https://checkout.xendit.co/v2/placeholder-${appointmentId}`;
  const base = frontendUrl();
  const res = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      external_id: externalId,
      amount,
      currency: "PHP",
      payment_methods: [paymentMethod],
      success_redirect_url: `${base}/payment-confirmation?appointment_id=${appointmentId}`,
      failure_redirect_url: `${base}/booking`,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { invoice_url?: string; error_code?: string; message?: string };
  if (!res.ok || !data.invoice_url) {
    console.error(`XENDIT CREATE INVOICE ERROR (${paymentMethod}):`, res.status, data.error_code, data.message);
    throw new XenditInvoiceError(data.message || `Xendit API returned ${res.status}.`);
  }
  return data.invoice_url;
}

/** Xendit signs callbacks with the account's callback verification token. */
export function isValidXenditCallback(req: Request) {
  const expected = process.env.XENDIT_CALLBACK_TOKEN;
  const received = req.headers.get("x-callback-token");
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
