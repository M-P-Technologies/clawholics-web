import "server-only";
import { requireUserRow } from "../auth";
import { getSql } from "../db";
import { readJson } from "../http";
import { ported } from "../worker";

// GET and PUT /users/email-preferences (signed in): whether the client gets the rebooking emails
// (customer_profiles.nudge_emails_off, which their unsubscribe link also sets). Booking emails
// are never affected.

async function requireClientRow() {
  const requester = await requireUserRow();
  if (requester instanceof Response) return requester;
  if (requester.id === null) return Response.json({ message: "User ID is required" }, { status: 400 });
  return requester as typeof requester & { id: number };
}

export const getEmailPreferences = ported(async () => {
  const client = await requireClientRow();
  if (client instanceof Response) return client;
  const [row] = await getSql()<{ off: number | null }[]>`select nudge_emails_off as off from customer_profiles where user_id = ${client.id}`;
  return Response.json({ rebook_emails: (row?.off ?? 0) === 0 });
});

export const updateEmailPreferences = ported(async (req) => {
  const client = await requireClientRow();
  if (client instanceof Response) return client;
  const body = await readJson<{ rebook_emails?: unknown }>(req);
  if (typeof body.rebook_emails !== "boolean") return Response.json({ message: "rebook_emails must be true or false." }, { status: 400 });
  const updated = await getSql()`update customer_profiles set nudge_emails_off = ${body.rebook_emails ? 0 : 1} where user_id = ${client.id} returning user_id`;
  if (updated.length === 0) return Response.json({ message: "Profile not found" }, { status: 404 });
  return Response.json({ rebook_emails: body.rebook_emails });
});
