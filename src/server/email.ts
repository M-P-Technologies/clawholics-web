import "server-only";
import { getAppointment, type AppointmentRow } from "./appointments";
import { WALKIN_EMAIL } from "@/lib/admin/walkin";
import { withSalonLocation } from "@/lib/homeSections";
import { publicReads } from "./publicCache";

// Resend emails, first ported from worker-api/src/index.ts. Every value is HTML-escaped: names
// and other fields are typed by clients, so unescaped they could inject markup into the emails.
//
// Resend's plan has a sending quota, so the salon only gets a copy of what it can't see
// otherwise: the admin bell already shows paid bookings and payment proofs, and an admin's own
// actions (walk-ins, approvals, stamps, cancelling or moving a booking) need no email back.

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://clawholicsbymax.com").replace(/\/+$/, "");
const FROM = "Clawholics <appointments@clawholicsbymax.com>";
const adminEmail = () => process.env.ADMIN_EMAIL || "appointments@clawholicsbymax.com";

// The shared walk-in guest's address has no inbox behind it: sending there only bounces, which
// hurts the domain's sending reputation
const hasInbox = (to: string) => Boolean(to.trim()) && to.trim().toLowerCase() !== WALKIN_EMAIL;

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("SKIP EMAIL - RESEND_API_KEY missing");
    return;
  }
  if (!hasInbox(to)) return;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    console.error(`Resend API error for ${to}:`, JSON.stringify(data));
    throw new Error(data.message || "Failed to send email via Resend");
  }
}

/** Sends the client's and the salon's copies independently: one failing doesn't hide the other's error. */
async function sendAll(sends: (Promise<unknown> | null)[]) {
  const failed = (await Promise.allSettled(sends)).filter((r) => r.status === "rejected");
  if (failed.length) throw new AggregateError(failed.map((r) => r.reason), `${failed.length} email(s) failed to send`);
}

/**
 * Up to 100 emails in one Resend call (its batch endpoint). Throws if Resend refuses the batch or
 * there is no key, so the caller can keep them for another try.
 */
async function sendEmailBatch(emails: { to: string; subject: string; html: string }[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(emails.map((e) => ({ from: FROM, ...e }))),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    console.error("Resend batch API error:", JSON.stringify(data));
    throw new Error(data.message || "Failed to send emails via Resend");
  }
}

// --- Formatting -------------------------------------------------------------------------------

/** "2026-11-05" → "Thursday, November 5, 2026" (unchanged when it isn't a date) */
const longDate = (ymd: string) => {
  const date = new Date(`${ymd}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
};

/** "13:00" → "1:00 PM" (unchanged when it isn't a time) */
const clock = (hhmm: string) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!match) return hhmm;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
};

/** A booked time, "13:00-14:30" → "1:00 PM – 2:30 PM" */
const timeRange = (time: string) => String(time ?? "").split("-").map(clock).join(" – ");

const peso = (amount: unknown) => `₱${Number(amount).toLocaleString("en-US")}`;

// The payment codes stored by Xendit and the payment-proof flow, as clients know them
const PAYMENT_LABELS: Record<string, string> = {
  QRPH: "QR Ph", QR_CODE: "QR Ph", MANUAL: "Payment proof", GCASH: "GCash", PAYMAYA: "Maya",
  GRABPAY: "GrabPay", SHOPEEPAY: "ShopeePay", CREDIT_CARD: "Card",
};
const paymentLabel = (method: unknown) => {
  const code = String(method ?? "").trim().toUpperCase();
  return PAYMENT_LABELS[code] ?? code.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

// --- Layout -----------------------------------------------------------------------------------

// The brand book's colours (globals.css), fixed: an email can't follow the site's theme switch.
// Pink words use the readable ink, never the pastel pink, which is only for fills and lines.
const BRAND = {
  pink: "#ff88a1",
  pinkLight: "#f3b6c4",
  cream: "#f6e9e1",
  sand: "#e8d7cd",
  milk: "#fffbf8",
  text: "#7a5f5a",
  ink: "#78404c",
  onPink: "#3d2b28",
  danger: "#9c3f4d",
};
// Gloock and Noto Sans load where the mail app allows web fonts (Apple Mail, iOS); elsewhere the
// fallbacks are the nearest common fonts
const DISPLAY_FONT = "Gloock, Georgia, 'Times New Roman', serif";
const BODY_FONT = "'Noto Sans', 'Helvetica Neue', Arial, sans-serif";
const LINK = `color: ${BRAND.ink}; text-decoration: underline; font-weight: bold;`;

interface SalonLocation {
  text: string;
  url: string | null;
}
const DEFAULT_LOCATION: SalonLocation = {
  text: "7th 3rd Street, Nazareth, Cagayan de Oro",
  url: "https://maps.app.goo.gl/HoFQm1ncohKwWHc9A",
};

/** The address and map link as the site shows them (withSalonLocation), or the old fixed one */
async function salonLocation(): Promise<SalonLocation> {
  try {
    const [home, about] = await Promise.all([publicReads.content("home"), publicReads.content("about")]);
    const { contact_location: text, contact_location_url: url } = withSalonLocation(
      (home ?? {}) as Record<string, string>,
      about as { about_location?: string; about_location_url?: string } | null,
    );
    return text?.trim() ? { text: text.trim(), url: url?.trim() || null } : DEFAULT_LOCATION;
  } catch (error) {
    console.error("[email] could not read the salon's address, using the default:", error);
    return DEFAULT_LOCATION;
  }
}

/** The whole email: cream page, the logo, a milk card holding `body`, and `footer` under it */
function emailDocument({ preview, title, body, footer }: { preview: string; title: string; body: string; footer: string }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Gloock&family=Noto+Sans:wght@400;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.cream};">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: ${BRAND.cream};">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${BRAND.cream};">
    <tr><td align="center" style="padding: 32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; font-family: ${BODY_FONT}; color: ${BRAND.text};">
        <tr><td align="center" style="padding: 0 0 20px 0;">
          <a href="${SITE}" style="text-decoration: none;"><img src="${SITE}/email-logo.png" width="220" height="59" alt="Clawholics by Max · Nail Art Studio" style="display: block; border: 0; width: 220px; height: auto;"></a>
        </td></tr>
        <tr><td style="background-color: ${BRAND.milk}; border: 1px solid ${BRAND.sand}; border-radius: 20px; padding: 36px 32px;">
          ${body}
        </td></tr>
        <tr><td align="center" style="padding: 24px 16px 0 16px; font-size: 13px; line-height: 1.6; color: ${BRAND.text};">
          ${footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** A small uppercase label over a heading */
const eyebrow = (text: string) =>
  `<p style="margin: 0 0 6px 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-weight: bold; color: ${BRAND.ink};">${escapeHtml(text)}</p>`;

/** The details box: one row per [label, value]; `strong` rows stand out. Values are escaped here. */
function detailsBox(heading: string, rows: ([string, unknown, boolean?] | null)[]) {
  const lines = rows
    .filter((row): row is [string, unknown, boolean?] => row !== null)
    .map(
      ([label, value, strong], i) => `
      <tr>
        <td style="padding: 10px 0; ${i ? `border-top: 1px solid ${BRAND.sand};` : ""} width: 38%; vertical-align: top; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: ${BRAND.text};">${escapeHtml(label)}</td>
        <td style="padding: 10px 0; ${i ? `border-top: 1px solid ${BRAND.sand};` : ""} font-size: 15px; color: ${strong ? BRAND.ink : BRAND.onPink}; ${strong ? "font-weight: bold;" : ""}">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; background-color: ${BRAND.cream}; border-radius: 14px;">
      <tr><td style="padding: 18px 20px 8px 20px;">
        <p style="margin: 0 0 4px 0; font-family: ${DISPLAY_FONT}; font-size: 18px; color: ${BRAND.onPink};">${escapeHtml(heading)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${lines}</table>
      </td></tr>
    </table>`;
}

/** A pink pill button */
const button = (label: string, href: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px auto 0 auto;">
    <tr><td align="center" style="background-color: ${BRAND.pink}; border-radius: 999px;">
      <a href="${href}" style="display: inline-block; padding: 14px 32px; font-family: ${BODY_FONT}; font-size: 15px; font-weight: bold; color: ${BRAND.onPink}; text-decoration: none; border-radius: 999px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;

// Matches the salon's terms (lib/visitCompletion.ts's late fees, the 72-hour reschedule rule)
const VISIT_REMINDERS = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; border-left: 4px solid ${BRAND.pinkLight};">
    <tr><td style="padding: 2px 0 2px 16px; font-size: 14px; line-height: 1.6;">
      <p style="margin: 0 0 6px 0; font-family: ${DISPLAY_FONT}; font-size: 17px; color: ${BRAND.onPink};">Before your visit</p>
      <p style="margin: 0 0 6px 0;">⏰ Please arrive on time. Arriving 15 minutes late adds a ₱100 fee, and 20 minutes ₱150. From 25 minutes late the visit may be cancelled, and the downpayment is kept.</p>
      <p style="margin: 0 0 6px 0;">📅 Need another day? Reschedule from your account up to 72 hours before your visit.</p>
      <p style="margin: 0;">💅 The rest of the price is paid at the salon after your visit.</p>
    </td></tr>
  </table>`;

// The day-before reminder's version: the visit is tomorrow, so changing it in the account (72 hours
// ahead) is no longer possible and it points to the salon instead
const DAY_BEFORE_REMINDERS = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 28px; border-left: 4px solid ${BRAND.pinkLight};">
    <tr><td style="padding: 2px 0 2px 16px; font-size: 14px; line-height: 1.6;">
      <p style="margin: 0 0 6px 0; font-family: ${DISPLAY_FONT}; font-size: 17px; color: ${BRAND.onPink};">Before your visit</p>
      <p style="margin: 0 0 6px 0;">⏰ Please arrive on time. Arriving 15 minutes late adds a ₱100 fee, and 20 minutes ₱150. From 25 minutes late the visit may be cancelled, and the downpayment is kept.</p>
      <p style="margin: 0 0 6px 0;">📅 Plans changed? Changes close 72 hours before a visit, so please <a href="${SITE}/contact" style="${LINK}">contact us</a> as soon as you can.</p>
      <p style="margin: 0;">💅 The rest of the price is paid at the salon after your visit.</p>
    </td></tr>
  </table>`;

interface ClientEmail {
  /** The small label over the greeting, e.g. "Appointment confirmed"; also the document's title */
  title: string;
  name: string;
  /** HTML; values in it must be escaped already */
  message: string;
  /** The inbox's preview line */
  preview: string;
  details: { heading: string; rows: ([string, unknown, boolean?] | null)[] };
  cta?: { label: string; href: string };
  reminders?: boolean;
  /** The day-before reminder's "Before your visit" box, instead of the confirmation's */
  dayBefore?: boolean;
  location: SalonLocation;
}

function clientEmailHtml({ title, name, message, preview, details, cta, reminders = false, dayBefore = false, location }: ClientEmail) {
  const address = escapeHtml(location.text);
  const body = `
    ${eyebrow(title)}
    <h1 style="margin: 0 0 14px 0; font-family: ${DISPLAY_FONT}; font-weight: normal; font-size: 30px; line-height: 1.2; color: ${BRAND.onPink};">Hi ${escapeHtml(firstName(name))}!</h1>
    <p style="margin: 0; font-size: 16px; line-height: 1.6;">${message}</p>
    ${detailsBox(details.heading, details.rows)}
    ${cta ? button(cta.label, cta.href) : ""}
    ${dayBefore ? DAY_BEFORE_REMINDERS : reminders ? VISIT_REMINDERS : ""}
    <p style="margin: 32px 0 0 0; font-size: 15px; line-height: 1.6;">See you soon,<br><span style="font-family: ${DISPLAY_FONT}; font-size: 18px; color: ${BRAND.ink};">Clawholics by Max</span> 💖</p>`;
  const footer = `
    <p style="margin: 0 0 6px 0;">📍 ${location.url ? `<a href="${escapeHtml(location.url)}" style="${LINK}">${address}</a>` : address}</p>
    <p style="margin: 0 0 6px 0;">Questions? Reply to this email or <a href="${SITE}/contact" style="${LINK}">contact us</a>.</p>
    <p style="margin: 0;"><a href="${SITE}/terms" style="${LINK}">Terms</a> &nbsp;·&nbsp; <a href="${SITE}/faq" style="${LINK}">FAQs</a> &nbsp;·&nbsp; <a href="${SITE}" style="${LINK}">clawholicsbymax.com</a></p>`;
  return emailDocument({ preview, title, body, footer });
}

/** The salon's copy: the same frame, shorter, with the facts as a list */
function adminEmailHtml(title: string, rows: ([string, unknown, boolean?] | null)[], note = "") {
  const body = `
    ${eyebrow("For the salon team")}
    <h1 style="margin: 0; font-family: ${DISPLAY_FONT}; font-weight: normal; font-size: 26px; line-height: 1.2; color: ${BRAND.onPink};">${escapeHtml(title)}</h1>
    ${note ? `<p style="margin: 14px 0 0 0; font-size: 15px; line-height: 1.6; font-weight: bold; color: ${BRAND.danger};">${note}</p>` : ""}
    ${detailsBox("Details", rows)}
    ${button("Open Clients & Bookings", `${SITE}/clients`)}`;
  const footer = `<p style="margin: 0;">An automatic message for the Clawholics team.</p>`;
  return emailDocument({ preview: title, title, body, footer });
}

const MANAGE = { label: "Manage your appointment", href: `${SITE}/my/appointments` };

// --- Booking emails ---------------------------------------------------------------------------

/** To the client, once a booking is confirmed: paid online, paid by an approved proof, or a walk-in an admin added. */
export async function sendConfirmationEmail(appt: AppointmentRow, { walkIn = false } = {}) {
  const paid = !walkIn && String(appt.payment_status ?? "").toUpperCase() === "PAID" && Number(appt.payment_amount) > 0;
  const when = `${longDate(appt.appointment_date)}, ${timeRange(appt.appointment_time)}`;

  await sendEmail(
    appt.email,
    "Your appointment is confirmed | Clawholics by Max",
    clientEmailHtml({
      title: "Appointment confirmed",
      name: appt.client_name,
      message: `Your appointment with <strong style="color: ${BRAND.ink};">${escapeHtml(appt.nailist_name)}</strong> is confirmed.${walkIn ? "" : " We can't wait to see you!"}`,
      preview: `${appt.service_name} on ${when}`,
      details: {
        heading: "Your appointment",
        rows: [
          ["Service", appt.service_name],
          ["Artist", appt.nailist_name],
          ["Date", longDate(appt.appointment_date), true],
          ["Time", timeRange(appt.appointment_time), true],
          appt.duration ? ["Duration", appt.duration] : null,
          appt.service_price ? ["Price", `from ${peso(appt.service_price)}`] : null,
          paid ? ["Downpayment paid", `${peso(appt.payment_amount)} by ${paymentLabel(appt.payment_method)}`] : null,
          ["Booking no.", `#${appt.id}`],
        ],
      },
      // A walk-in may have no account to manage it from, and may be recorded once it has started
      cta: walkIn ? undefined : MANAGE,
      reminders: !walkIn,
      location: await salonLocation(),
    }),
  );
}

/** Confirmation email once a booking is confirmed by a Xendit payment or an approved payment proof. */
export async function sendAppointmentConfirmation(appointmentId: number) {
  const appt = await getAppointment(appointmentId);
  if (appt) await sendConfirmationEmail(appt);
}

/**
 * To the client, and to the salon only when the client cancelled it themselves or a refund has to
 * be made by hand.
 */
export async function sendCancellationEmails(data: {
  email: string; name: string; service: string; date: string; time: string; artist: string; status: string;
  appointmentId: number; isLateCancellation?: boolean; manualRefundAmount?: number;
  /** Why the refund is by hand: paid by payment proof, or Xendit couldn't refund it (QR Ph can't be) */
  manualRefundReason?: "proof" | "gateway"; byClient: boolean;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const refunded = data.status.toUpperCase() === "REFUNDED";
  const message =
    `Your appointment has been cancelled.` +
    (refunded ? " Your downpayment is being refunded; it can take a few business days to reach you." : "") +
    (data.isLateCancellation
      ? `<br><br><span style="color: ${BRAND.danger};"><strong>Please note:</strong> it was cancelled less than 72 hours before the visit, so the downpayment is non-refundable under our cancellation policy.</span>`
      : "") +
    "<br><br>We'd love to see you another time.";
  const rows: [string, unknown, boolean?][] = [
    ["Service", data.service],
    ["Artist", data.artist],
    ["Date", longDate(data.date)],
    ["Time", timeRange(data.time)],
    ["Booking no.", `#${data.appointmentId}`],
  ];
  const manualRefund = data.manualRefundAmount !== undefined;

  await sendAll([
    sendEmail(
      data.email,
      `Your appointment is cancelled${refunded ? " and refunded" : ""} | Clawholics by Max`,
      clientEmailHtml({
        title: refunded ? "Cancelled and refunded" : "Appointment cancelled",
        name: data.name,
        message,
        preview: `${data.service} on ${longDate(data.date)} is cancelled`,
        details: { heading: "Cancelled appointment", rows },
        cta: { label: "Book a new visit", href: `${SITE}/my/book` },
        location: await salonLocation(),
      }),
    ),
    data.byClient || manualRefund
      ? sendEmail(
          adminEmail(),
          `CLAWHOLICS: Appointment ${data.status} - ${data.name}`,
          adminEmailHtml(
            data.byClient ? `${data.name} cancelled a booking` : `A booking for ${data.name} was cancelled`,
            [
              ["Client", data.name],
              ["Email", data.email],
              ...rows,
              ["Downpayment", data.isLateCancellation ? "Kept (late cancellation)" : manualRefund ? "To refund by hand" : refunded ? "Refunded" : "None paid"],
            ],
            manualRefund
              ? data.manualRefundReason === "gateway"
                ? `Manual refund needed: ${escapeHtml(peso(data.manualRefundAmount))}. Xendit couldn't refund it automatically (QR Ph payments usually can't be refunded that way), so please send it back to the client yourself. Check the Xendit dashboard first, in case it did go through.`
                : `Manual refund needed: ${escapeHtml(peso(data.manualRefundAmount))} (paid by payment proof).`
              : "",
          ),
        )
      : null,
  ]);
}

/** To the client, and to the salon only when the client moved it themselves. */
export async function sendRescheduleEmails(data: {
  email: string; name: string; service: string; oldDate: string; oldTime: string; newDate: string; newTime: string;
  artist: string; appointmentId: number; byClient: boolean;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const newWhen = `${longDate(data.newDate)}, ${timeRange(data.newTime)}`;
  const oldWhen = `${longDate(data.oldDate)}, ${timeRange(data.oldTime)}`;

  await sendAll([
    sendEmail(
      data.email,
      "Your appointment has a new date | Clawholics by Max",
      clientEmailHtml({
        title: "Appointment rescheduled",
        name: data.name,
        message: `Your appointment has been moved to <strong style="color: ${BRAND.ink};">${escapeHtml(newWhen)}</strong>.`,
        preview: `${data.service}, now on ${newWhen}`,
        details: {
          heading: "Your new appointment",
          rows: [
            ["Service", data.service],
            ["Artist", data.artist],
            ["New date", longDate(data.newDate), true],
            ["New time", timeRange(data.newTime), true],
            ["Was", oldWhen],
            ["Booking no.", `#${data.appointmentId}`],
          ],
        },
        cta: MANAGE,
        reminders: true,
        location: await salonLocation(),
      }),
    ),
    data.byClient
      ? sendEmail(
          adminEmail(),
          `CLAWHOLICS: Appointment Rescheduled - ${data.name}`,
          adminEmailHtml(`${data.name} moved a booking`, [
            ["Client", data.name],
            ["Email", data.email],
            ["Service", data.service],
            ["Artist", data.artist],
            ["New", newWhen, true],
            ["Was", oldWhen],
            ["Booking no.", `#${data.appointmentId}`],
          ]),
        )
      : null,
  ]);
}

// --- Loyalty and birthday ---------------------------------------------------------------------

/** To the client once their loyalty card is full (an admin's own action, so the salon gets no copy). */
export async function sendLoyaltyRewardEmail(clientEmail: string, clientName: string, stampsRequired: number) {
  await sendEmail(
    clientEmail,
    "Clawholics: Your Loyalty Reward is here!",
    clientEmailHtml({
      title: "Loyalty card complete",
      name: clientName,
      message: `Congratulations! You've collected <strong style="color: ${BRAND.ink};">${stampsRequired} stamps</strong> on your loyalty card. You can now enjoy a special reward on your next visit!`,
      preview: `You've collected ${stampsRequired} stamps: your reward is waiting`,
      details: { heading: "Your loyalty card", rows: [["Stamps collected", `${stampsRequired} / ${stampsRequired}`, true]] },
      cta: { label: "Book your next visit", href: `${SITE}/my/book` },
      location: await salonLocation(),
    }),
  );
}

/**
 * The day-before reminders, one email per booking, in Resend batches. Throws if Resend refuses the
 * batch, so the caller can put the bookings back for another try.
 */
export async function sendAppointmentReminderEmails(
  bookings: { id: number; email: string; first_name: string; service_name: string; nailist_name: string; appointment_date: string; appointment_time: string }[],
) {
  const location = await salonLocation();
  await sendEmailBatch(
    bookings.map((b) => ({
      to: b.email,
      subject: "Reminder: your appointment is tomorrow | Clawholics by Max",
      html: clientEmailHtml({
        title: "See you tomorrow",
        name: b.first_name || "there",
        message: `A friendly reminder that your appointment with <strong style="color: ${BRAND.ink};">${escapeHtml(b.nailist_name)}</strong> is <strong style="color: ${BRAND.ink};">tomorrow</strong>. We can't wait to see you!`,
        preview: `${b.service_name} tomorrow, ${timeRange(b.appointment_time)}`,
        details: {
          heading: "Your appointment",
          rows: [
            ["Service", b.service_name],
            ["Artist", b.nailist_name],
            ["Date", longDate(b.appointment_date), true],
            ["Time", timeRange(b.appointment_time), true],
            ["Booking no.", `#${b.id}`],
          ],
        },
        cta: MANAGE,
        dayBefore: true,
        location,
      }),
    })),
  );
}

const voucherDate = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** The birthday vouchers issued by the monthly run, one email per client. */
export async function sendBirthdayVoucherEmails(
  vouchers: { email: string; first_name: string; code: string; discount_pct: number; valid_until: string }[],
) {
  const location = await salonLocation();
  await sendEmailBatch(
    vouchers.map((v) => ({
      to: v.email,
      subject: `Clawholics: Happy birthday! Here's ${v.discount_pct}% off`,
      html: clientEmailHtml({
        title: "Happy birthday",
        name: v.first_name,
        message: `Happy birthday from all of us at Clawholics! 🎂 To celebrate, here's <strong style="color: ${BRAND.ink};">${escapeHtml(v.discount_pct)}% off</strong> a service of your choice this month.
          Claim it on your profile, then book your visit; the discount comes off the service price you pay at the salon.`,
        preview: `${v.discount_pct}% off a service this month, just for you`,
        details: {
          heading: "Your birthday voucher",
          rows: [
            ["Voucher code", v.code, true],
            ["Discount", `${v.discount_pct}% off the service price`],
            ["Valid until", voucherDate(v.valid_until)],
          ],
        },
        cta: { label: "Claim your voucher", href: `${SITE}/my` },
        location,
      }),
    })),
  );
}

/** The contact form, sent to the salon. */
export async function sendContactMessage(data: { name: string; email: string; mobile?: string; description: string }) {
  // Subjects are a single line
  const name = data.name.replace(/[\r\n]+/g, " ");
  await sendEmail(
    adminEmail(),
    `NEW MESSAGE: From ${name}`,
    adminEmailHtml(`New message from ${name}`, [
      ["Name", data.name],
      ["Email", data.email],
      ["Mobile", data.mobile || "N/A"],
      ["Message", data.description],
    ]),
  );
}

export { escapeHtml };
