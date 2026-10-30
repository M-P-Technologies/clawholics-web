import "server-only";
import { isCronCall } from "../cron";
import { sendRebookNudges } from "../rebookNudges";
import { sendAppointmentReminders } from "../reminders";
import { nextApiEnabled } from "../worker";

// GET /cron/appointment-reminders (Vercel Cron, daily): the day-before reminder emails and the
// rebooking emails (one daily job for both: the free plan allows only two cron jobs, and the birthday
// vouchers have the other). Refused without `Authorization: Bearer $CRON_SECRET`. Not wrapped in
// ported(): it would start a second run of a stalled GET and answer 503 at 30s while emails are
// still going out. Both runs are safe to repeat (see server/reminders.ts and server/rebookNudges.ts),
// so a failed one waits for the next day, and one failing doesn't stop the other.

const errorBody = (message: string, status: number) => Response.json({ error: message, message }, { status });

export async function runAppointmentReminderCron(req: Request): Promise<Response> {
  if (!isCronCall(req)) return errorBody("Unauthorized", 401);
  if (!nextApiEnabled()) return errorBody("API_BACKEND is not next", 503);

  const result: { reminders?: unknown; rebook?: unknown; failed: string[] } = { failed: [] };
  try {
    result.reminders = await sendAppointmentReminders();
  } catch (error) {
    console.error("[reminders] run failed:", error);
    result.failed.push("reminders");
  }
  try {
    result.rebook = await sendRebookNudges();
  } catch (error) {
    console.error("[rebook] run failed:", error);
    result.failed.push("rebook");
  }
  console.log("[reminders] run:", JSON.stringify(result));
  return Response.json(result, { status: result.failed.length ? 500 : 200 });
}
