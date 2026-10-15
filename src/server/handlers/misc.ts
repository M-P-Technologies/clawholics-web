import "server-only";
import { sendContactMessage } from "../email";
import { inBackground, readJson } from "../http";
import { ported } from "../worker";

// The Worker's remaining small routes (worker-api/src/index.ts: /emails, /health, /submit).

// POST /submit (public): the contact form, emailed to the salon after the response.
export const submitContactForm = ported(async (req) => {
  const { name, email, mobile, description } = await readJson<Record<string, unknown>>(req);
  if (!name || !email || !description) return Response.json({ message: "Missing required fields" }, { status: 400 });
  const fields = { name: String(name), email: String(email), mobile: mobile ? String(mobile) : "", description: String(description) };
  if (fields.name.length > 200 || fields.email.length > 320 || fields.mobile.length > 50 || fields.description.length > 5000) {
    return Response.json({ message: "Message is too long" }, { status: 400 });
  }
  // The reply goes to this address, so it has to look like one (no spaces or line breaks)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    return Response.json({ message: "Please enter a valid email address" }, { status: 400 });
  }
  inBackground("contact form email", () => sendContactMessage(fields));
  return Response.json({ success: true, message: "Message sent successfully" });
});

// POST /emails (and POST / on the Worker): the payment confirmation page asked the Worker to
// email whatever it was sent, to any address. The confirmation emails are already sent on the
// server when a payment is confirmed (the Xendit webhook and an approved payment proof), so
// this only answers like the Worker did and sends nothing.
export const sendConfirmationEmailRoute = ported(async () => Response.json({ success: true }));

export const health = ported(async () => Response.json({ status: "ok", service: "clawholics-api-staging" }));
