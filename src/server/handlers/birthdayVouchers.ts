import "server-only";
import { requireUserRow } from "../auth";
import { isCronCall } from "../cron";
import { claimVoucher, getCurrentVoucher, issueBirthdayVouchers } from "../birthdayVouchers";
import { nextApiEnabled, ported } from "../worker";

// Birthday vouchers (src/server/birthdayVouchers.ts). Not on the Worker.

const errorBody = (message: string, status: number) => Response.json({ error: message, message }, { status });

/** The signed-in client's users.id; admins (even one promoted after the voucher was issued) have none */
async function requireClient(): Promise<{ id: number; admin: boolean } | Response> {
  const requester = await requireUserRow();
  if (requester instanceof Response) return requester;
  if (requester.id === null) return errorBody("Unauthenticated: Please log in.", 401);
  return { id: requester.id, admin: requester.role === "admin" };
}

// GET /vouchers/birthday: the signed-in client's voucher for this year's birthday month, or null
export const getMyBirthdayVoucher = ported(async () => {
  const client = await requireClient();
  if (client instanceof Response) return client;
  return Response.json(client.admin ? null : await getCurrentVoucher(client.id));
});

// POST /vouchers/birthday/claim: claims it, during the birthday month
export const claimMyBirthdayVoucher = ported(async () => {
  const client = await requireClient();
  if (client instanceof Response) return client;
  if (client.admin) return errorBody("You don't have a birthday voucher this year.", 404);
  const result = await claimVoucher(client.id);
  if (result === "none") return errorBody("You don't have a birthday voucher this year.", 404);
  if (result === "not-claimable") return errorBody("This birthday voucher can no longer be claimed.", 409);
  return Response.json(result);
});


// GET /cron/birthday-vouchers: Vercel Cron, daily at 00:00 Manila (vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET`; without CRON_SECRET set, every call is refused.
// Not wrapped in ported(): it would start a second run of a stalled GET and answer 503 at 30s
// while emails are still going out. The run is safe to repeat, so a failed one waits for the next day.
export async function runBirthdayVoucherCron(req: Request): Promise<Response> {
  if (!isCronCall(req)) return errorBody("Unauthorized", 401);
  if (!nextApiEnabled()) return errorBody("API_BACKEND is not next", 503);
  try {
    const result = await issueBirthdayVouchers();
    console.log("[birthday] voucher run:", JSON.stringify(result));
    return Response.json(result);
  } catch (error) {
    console.error("[birthday] voucher run failed:", error);
    return errorBody("The birthday voucher run failed.", 500);
  }
}
