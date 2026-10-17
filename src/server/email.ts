import "server-only";
import { getAppointment, type AppointmentRow } from "./appointments";

// Resend emails, ported from worker-api/src/index.ts with the same subjects and layout.
// Unlike the Worker, every value is HTML-escaped: names and other fields are typed by
// clients, so unescaped they could inject markup into the emails.

const escapeHtml = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );

const adminEmail = () => process.env.ADMIN_EMAIL || "appointments@clawholicsbymax.com";

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("SKIP EMAIL - RESEND_API_KEY missing");
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Clawholics <appointments@clawholicsbymax.com>", to, subject, html }),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    console.error(`Resend API error for ${to}:`, JSON.stringify(data));
    throw new Error(data.message || "Failed to send email via Resend");
  }
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
    body: JSON.stringify(emails.map((e) => ({ from: "Clawholics <appointments@clawholicsbymax.com>", ...e }))),
  });
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    console.error("Resend batch API error:", JSON.stringify(data));
    throw new Error(data.message || "Failed to send emails via Resend");
  }
}

// Client-style row (label, value) and admin-style row; values are escaped here.
const clientRow = (label: string, value: unknown, valueStyle = "") =>
  `<tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; width: 140px; color: #64748b; font-weight: bold;">${label}:</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9;${valueStyle}">${escapeHtml(value)}</td></tr>`;
const adminRow = (label: string, valueHtml: string, valueStyle = "") =>
  `<tr><td style="padding: 8px 0; border-bottom: 1px solid #eee; width: 140px; font-weight: bold;">${label}:</td><td style="padding: 8px 0; border-bottom: 1px solid #eee;${valueStyle}">${valueHtml}</td></tr>`;
const HIGHLIGHT = " font-weight: bold; color: #CC798B;";

function baseEmailTemplate(
  title: string,
  hiName: string,
  messageHtml: string,
  tableRows: string,
  showReminders = true,
  detailsHeading = "Appointment Details",
) {
  const remindersSection = showReminders
    ? `
    <div style="margin-top:32px; border-top: 2px solid #f1f5f9; padding-top: 24px;">
      <h3 style="color: #CC798B; margin-top: 0;">Important Reminders!</h3>
      <ul style="padding-left: 20px; line-height: 1.6; margin-top: 8px;">
        <li>Please arrive on time.</li>
        <li>Late arrivals may shorten appointment duration.</li>
        <li>Read our full terms and conditions below.</li>
      </ul>
      <div style="margin-top: 16px;">
        <a href="https://clawholicsbymax.com/profile" style="color: #CC798B; text-decoration: none; display: block; margin-bottom: 8px;">Manage Your Appointment/s here</a>
        <a href="https://clawholicsbymax.com/terms" style="color: #CC798B; text-decoration: none; display: block; margin-bottom: 8px;">Read Terms & Conditions here</a>
        <a href="https://clawholicsbymax.com/" style="color: #CC798B; text-decoration: none; display: block;">Read FAQs here</a>
      </div>
    </div>
  `
    : "";

  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
      <div style="background-color: #CC798B; color: #ffffff; padding: 24px; text-align: center;">
        <h2 style="margin: 0; font-size: 24px; letter-spacing: 0.5px;">Clawholics</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">${escapeHtml(title)}</p>
      </div>
      <div style="padding: 32px; background-color: #ffffff; color: #334155;">
        <h3 style="color: #CC798B; margin-top: 0; font-size: 20px;">Hi ${escapeHtml(hiName)},</h3>
        <p style="font-size: 16px; line-height: 1.5; margin-top: 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px;">
          ${messageHtml}
        </p>
        <h4 style="margin-top: 24px; margin-bottom: 12px; color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">${escapeHtml(detailsHeading)}</h4>
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 15px;">
          ${tableRows}
        </table>
        ${remindersSection}
        <div style="margin-top:40px; padding-top: 24px; border-top: 1px solid #eee;">
          <p style="margin-bottom: 8px;">Thank you for choosing Clawholics 💖</p>
          <p style="margin-bottom: 8px;">For any further questions, you may reach us <a href="https://clawholicsbymax.com/contact" style="color: #CC798B; text-decoration: none;">here</a>.</p>
          <p>Location: <a href="https://maps.app.goo.gl/HoFQm1ncohKwWHc9A" target="_blank" style="color:#CC798B; text-decoration:none; font-weight:bold;">7th 3rd Street, Nazareth, Cagayan de Oro</a></p>
        </div>
      </div>
    </div>
  `;
}

function baseAdminEmailTemplate(title: string, tableRows: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #333; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #333; color: #ffffff; padding: 20px; text-align: center;">
        <h2 style="margin: 0; font-size: 20px;">ADMIN NOTIFICATION</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.8;">${escapeHtml(title)}</p>
      </div>
      <div style="padding: 24px; color: #333;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${tableRows}
        </table>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
          This is an automated notification for the Clawholics administration team.
        </div>
      </div>
    </div>
  `;
}

export interface ConfirmationData {
  appointment_id: number;
  payment_id: unknown;
  user_id: unknown;
  customer_email: string;
  customer_name: string;
  nailist_name: string;
  service_name: string;
  service_price: unknown;
  duration: unknown;
  appointment_date: string;
  appointment_time: string;
  payment_method: unknown;
  service_id?: unknown;
  nailist_id?: unknown;
}

export async function sendConfirmationEmail(data: ConfirmationData) {
  const clientRows = [
    clientRow("Appointment ID", data.appointment_id),
    clientRow("Payment ID", data.payment_id),
    clientRow("Service", data.service_name),
    clientRow("Starting Price", `₱${data.service_price}`),
    clientRow("Duration", data.duration),
    clientRow("Nailist", data.nailist_name),
    clientRow("Date", data.appointment_date, HIGHLIGHT),
    clientRow("Time", data.appointment_time, HIGHLIGHT),
    clientRow("Payment Method", data.payment_method),
  ].join("");

  const customerHtml = baseEmailTemplate(
    "Appointment Confirmed",
    data.customer_name,
    `Congratulations <strong>${escapeHtml(data.customer_name)}</strong>, your appointment with <strong>${escapeHtml(data.nailist_name)}</strong> has been successfully confirmed.`,
    clientRows,
    true,
  );

  const adminRows = [
    adminRow("Status", "CONFIRMED", " color: #2e7d32; font-weight: bold;"),
    adminRow("Customer", escapeHtml(data.customer_name)),
    adminRow("Customer ID", escapeHtml(data.user_id)),
    adminRow("Email", escapeHtml(data.customer_email)),
    adminRow("Appointment ID", escapeHtml(data.appointment_id)),
    adminRow("Payment ID", escapeHtml(data.payment_id)),
    adminRow("Service", `${escapeHtml(data.service_name)} (ID: ${escapeHtml(data.service_id || "N/A")})`),
    adminRow("Nailist", `${escapeHtml(data.nailist_name)} (ID: ${escapeHtml(data.nailist_id || "N/A")})`),
    adminRow("Date", escapeHtml(data.appointment_date), " font-weight: bold;"),
    adminRow("Time", escapeHtml(data.appointment_time), " font-weight: bold;"),
  ].join("");

  await Promise.all([
    sendEmail(data.customer_email, "Your appointment is confirmed | Clawholics by Max", customerHtml),
    sendEmail(adminEmail(), "NEW APPOINTMENT CONFIRMED", baseAdminEmailTemplate("New Appointment Confirmed", adminRows)),
  ]);
}

/**
 * After an online (Xendit) payment: the downpayment is in, but the booking is only confirmed when
 * an admin confirms it. The client hears that the salon will confirm; the salon hears there's a
 * booking to confirm. The confirmation email (sendAppointmentConfirmation) follows the admin's confirm.
 */
export async function sendPaymentReceived(appointmentId: number) {
  const det = await getAppointment(appointmentId);
  if (!det) return;
  const clientRows = [
    clientRow("Appointment ID", det.id),
    clientRow("Payment ID", det.payment_id),
    clientRow("Service", det.service_name),
    clientRow("Nailist", det.nailist_name),
    clientRow("Date", det.appointment_date, HIGHLIGHT),
    clientRow("Time", det.appointment_time, HIGHLIGHT),
    clientRow("Payment Method", det.payment_method),
  ].join("");
  const customerHtml = baseEmailTemplate(
    "Downpayment Received",
    det.client_name,
    `Thank you, <strong>${escapeHtml(det.client_name)}</strong>! We've received your downpayment. Your booking with <strong>${escapeHtml(det.nailist_name)}</strong> is waiting for the salon to confirm it, and we'll email you as soon as it's confirmed. Your time slot is held for you meanwhile.<br/><br/>
     <strong>Important:</strong> please <a href="${screenshotLink(det.id)}" style="color: #CC798B; font-weight: bold;">send a screenshot of your payment</a> in My account › Appointments. The salon confirms your booking once it has it.`,
    clientRows,
    false,
  );
  const adminRows = [
    adminRow("Status", "AWAITING CONFIRMATION", " color: #b26a00; font-weight: bold;"),
    adminRow("Customer", escapeHtml(det.client_name)),
    adminRow("Email", escapeHtml(det.email)),
    adminRow("Appointment ID", escapeHtml(det.id)),
    adminRow("Payment ID", escapeHtml(det.payment_id)),
    adminRow("Service", escapeHtml(det.service_name)),
    adminRow("Nailist", escapeHtml(det.nailist_name)),
    adminRow("Date", escapeHtml(det.appointment_date), " font-weight: bold;"),
    adminRow("Time", escapeHtml(det.appointment_time), " font-weight: bold;"),
  ].join("");
  await Promise.all([
    sendEmail(det.email, "We've received your downpayment | Clawholics by Max", customerHtml),
    sendEmail(adminEmail(), "BOOKING PAID: PLEASE CONFIRM", baseAdminEmailTemplate("Booking Paid, Waiting for Your Confirmation", adminRows)),
  ]);
}

/** Confirmation emails once the salon confirms: an admin confirming a paid booking, or approving a payment proof. */
export async function sendAppointmentConfirmation(appointmentId: number) {
  const det = await getAppointment(appointmentId);
  if (!det) return;
  await sendConfirmationEmail({
    appointment_id: det.id, payment_id: det.payment_id, user_id: det.user_id, customer_email: det.email,
    customer_name: det.client_name, nailist_name: det.nailist_name, service_name: det.service_name,
    service_price: det.service_price, duration: det.duration, appointment_date: det.appointment_date,
    appointment_time: det.appointment_time, payment_method: det.payment_method,
    service_id: det.service_id, nailist_id: det.nailist_id,
  });
}

export async function sendCancellationEmails(data: {
  email: string; name: string; service: string; date: string; time: string; artist: string; status: string;
  appointmentId: number; userId: number; serviceId: number; nailistId: number;
  isLateCancellation?: boolean; manualRefundAmount?: number;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const tableRows = [
    clientRow("Appointment ID", data.appointmentId),
    clientRow("Service", data.service),
    clientRow("Date", data.date),
    clientRow("Time", data.time),
    clientRow("Artist", data.artist),
  ].join("");

  const status = escapeHtml(data.status);
  const hiMessage =
    `This email is to confirm that your appointment has been successfully <strong style="color: #CC798B">${status.toLowerCase()}</strong>.` +
    (data.status.toUpperCase() === "REFUNDED" ? "<br/><br/>Your refund is being processed." : "") +
    (data.isLateCancellation
      ? '<br/><br/><span style="color: #b91c1c;"><strong>Note:</strong> As this appointment was cancelled within 3 days of the scheduled time, the payment is non-refundable per our salon cancellation policy.</span>'
      : "");

  const adminRows = [
    adminRow("Action", status.toUpperCase(), " color: #c62828; font-weight: bold;"),
    adminRow("Customer", escapeHtml(data.name)),
    adminRow("Customer ID", escapeHtml(data.userId)),
    adminRow("Appointment ID", escapeHtml(data.appointmentId)),
    adminRow("Service", `${escapeHtml(data.service)} (ID: ${escapeHtml(data.serviceId)})`),
    adminRow("Artist", `${escapeHtml(data.artist)} (ID: ${escapeHtml(data.nailistId)})`),
    adminRow("Original Date", escapeHtml(data.date)),
    adminRow("Original Time", escapeHtml(data.time)),
    data.manualRefundAmount !== undefined
      ? adminRow("Refund", `MANUAL REFUND NEEDED: ₱${escapeHtml(data.manualRefundAmount)} (paid by payment proof)`, " color: #c62828; font-weight: bold;")
      : "",
  ].join("");

  await Promise.all([
    sendEmail(data.email, `Appointment ${data.status}: ${data.service}`, baseEmailTemplate(`Appointment ${data.status}`, data.name, hiMessage, tableRows, false)),
    sendEmail(adminEmail(), `CLAWHOLICS: Appointment ${data.status} - ${data.name}`, baseAdminEmailTemplate(`Appointment ${data.status}`, adminRows)),
  ]);
}

export async function sendRescheduleEmails(data: {
  email: string; name: string; service: string; oldDate: string; oldTime: string; newDate: string; newTime: string;
  artist: string; appointmentId: number; userId: number; serviceId: number; nailistId: number;
}) {
  if (!process.env.RESEND_API_KEY) return;

  const tableRows = [
    clientRow("Appointment ID", data.appointmentId),
    clientRow("Service", data.service),
    clientRow("New Date", data.newDate, HIGHLIGHT),
    clientRow("New Time", data.newTime, HIGHLIGHT),
    `<tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">Previous Date/Time:</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #94a3b8;"><del>${escapeHtml(data.oldDate)} at ${escapeHtml(data.oldTime)}</del></td></tr>`,
    clientRow("Artist", data.artist),
  ].join("");

  const adminRows = [
    adminRow("Action", "RESCHEDULED", " color: #1976d2; font-weight: bold;"),
    adminRow("Customer", escapeHtml(data.name)),
    adminRow("Customer ID", escapeHtml(data.userId)),
    adminRow("Appointment ID", escapeHtml(data.appointmentId)),
    adminRow("Service", `${escapeHtml(data.service)} (ID: ${escapeHtml(data.serviceId)})`),
    adminRow("Artist", `${escapeHtml(data.artist)} (ID: ${escapeHtml(data.nailistId)})`),
    adminRow("New Date", escapeHtml(data.newDate), " font-weight: bold;"),
    adminRow("New Time", escapeHtml(data.newTime), " font-weight: bold;"),
    adminRow("Old Date", `<del>${escapeHtml(data.oldDate)}</del>`, " color: #777;"),
    adminRow("Old Time", `<del>${escapeHtml(data.oldTime)}</del>`, " color: #777;"),
  ].join("");

  await Promise.all([
    sendEmail(
      data.email,
      `Appointment Rescheduled: ${data.service}`,
      baseEmailTemplate("Appointment Rescheduled", data.name, 'This email is to confirm that your appointment has been successfully <strong style="color: #CC798B">rescheduled</strong>.', tableRows, true),
    ),
    sendEmail(adminEmail(), `CLAWHOLICS: Appointment Rescheduled - ${data.name}`, baseAdminEmailTemplate("Appointment Rescheduled", adminRows)),
  ]);
}

export async function sendPaymentProofAdminEmail(appt: AppointmentRow, proofId: number, imageUrl: string) {
  const adminRows = [
    adminRow("Proof ID", escapeHtml(proofId)),
    adminRow("Appointment ID", escapeHtml(appt.id)),
    adminRow("Customer", escapeHtml(appt.client_name)),
    adminRow("Email", escapeHtml(appt.email)),
    adminRow("Service", escapeHtml(appt.service_name)),
    adminRow("Nailist", escapeHtml(appt.nailist_name)),
    adminRow("Date", escapeHtml(appt.appointment_date)),
    adminRow("Time", escapeHtml(appt.appointment_time)),
    adminRow("Proof", `<a href="${escapeHtml(imageUrl)}">View image</a>`),
  ].join("");
  await sendEmail(
    adminEmail(),
    `CLAWHOLICS: Payment proof uploaded - ${appt.client_name}`,
    baseAdminEmailTemplate("Payment Proof Awaiting Review", adminRows),
  );
}

/** After a full loyalty card is redeemed: the client and the salon are told, independently. */
export async function sendLoyaltyRewardEmails(clientEmail: string, clientName: string, userId: number, stampsRequired: number) {
  const customerHtml = baseEmailTemplate(
    "Loyalty Card Complete!",
    clientName,
    `Congratulations! You've successfully collected <strong>${stampsRequired} stamps</strong> on your loyalty card. You are now eligible for a special reward on your next visit!`,
    clientRow("Stamps Collected", `${stampsRequired} / ${stampsRequired}`, HIGHLIGHT),
    false,
  );
  const adminRows = [
    adminRow("Milestone", `${stampsRequired} STAMPS REACHED`, " color: #CC798B; font-weight: bold;"),
    adminRow("Customer Name", escapeHtml(clientName)),
    adminRow("User ID", escapeHtml(userId)),
    adminRow("Email", `<a href="mailto:${escapeHtml(clientEmail)}">${escapeHtml(clientEmail)}</a>`),
  ].join("");

  // One failing (e.g. a spam filter drop) doesn't stop the other
  await Promise.all([
    clientEmail.trim()
      ? sendEmail(clientEmail, "Clawholics: Your Loyalty Reward is here!", customerHtml).catch((e) =>
          console.error("Client loyalty email failed to send:", e),
        )
      : null,
    sendEmail(
      adminEmail(),
      `CLAWHOLICS: Loyalty Reward - ${clientName} reached ${stampsRequired} stamps!`,
      baseAdminEmailTemplate(`Loyalty Milestone Reached - ${clientName}`, adminRows),
    ).catch((e) => console.error("Admin loyalty email failed to send:", e)),
  ]);
}

const voucherDate = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** The birthday vouchers issued by the monthly run, one email per client. */
export async function sendBirthdayVoucherEmails(
  vouchers: { email: string; first_name: string; code: string; discount_pct: number; valid_until: string }[],
) {
  await sendEmailBatch(
    vouchers.map((v) => ({
      to: v.email,
      subject: `Clawholics: Happy birthday! Here's ${v.discount_pct}% off`,
      html: baseEmailTemplate(
        "Happy Birthday!",
        v.first_name,
        `Happy birthday from all of us at Clawholics! 🎂 To celebrate, here's <strong>${escapeHtml(v.discount_pct)}% off</strong> a service of your choice this month.
         Claim it on <a href="${SITE}/my" style="color: #CC798B; font-weight: bold;">your profile</a>, then book your visit; the discount comes off the service price you pay at the salon.`,
        [
          clientRow("Voucher code", v.code, HIGHLIGHT),
          clientRow("Discount", `${v.discount_pct}% off the service price`),
          clientRow("Valid until", voucherDate(v.valid_until)),
        ].join(""),
        false,
        "Your Birthday Voucher",
      ),
    })),
  );
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://clawholicsbymax.com").replace(/\/+$/, "");
/** The client app's appointment, where the client sends the screenshot of their payment */
const screenshotLink = (appointmentId: unknown) => `${SITE}/my/appointments?appointment_id=${encodeURIComponent(String(appointmentId))}`;

/** The reminder for clients who haven't sent the screenshot of their payment, one email each. */
export async function sendScreenshotReminders(
  bookings: { id: number; email: string; first_name: string; service_name: string; appointment_date: string; appointment_time: string }[],
) {
  await sendEmailBatch(
    bookings.map((b) => ({
      to: b.email,
      subject: "Send your payment screenshot | Clawholics by Max",
      html: baseEmailTemplate(
        "One More Step",
        b.first_name,
        `We've received your downpayment, but we still need a <strong>screenshot of your payment</strong> before we can confirm your booking.
         Please <a href="${screenshotLink(b.id)}" style="color: #CC798B; font-weight: bold;">send it in My account › Appointments</a>. Your time slot is held for you meanwhile.`,
        [
          clientRow("Service", b.service_name),
          clientRow("Date", b.appointment_date, HIGHLIGHT),
          clientRow("Time", b.appointment_time, HIGHLIGHT),
        ].join(""),
        false,
        "Your Booking",
      ),
    })),
  );
}

/** The contact form, sent to the salon. */
export async function sendContactMessage(data: { name: string; email: string; mobile?: string; description: string }) {
  const rows = [
    adminRow("Name", escapeHtml(data.name)),
    adminRow("Email", escapeHtml(data.email)),
    adminRow("Mobile", escapeHtml(data.mobile || "N/A")),
    adminRow("Description", escapeHtml(data.description), " white-space: pre-wrap;"),
  ].join("");
  // Subjects are a single line
  const name = data.name.replace(/[\r\n]+/g, " ");
  await sendEmail(adminEmail(), `NEW MESSAGE: From ${name}`, baseAdminEmailTemplate("New Contact Form Message", rows));
}

export { escapeHtml };
