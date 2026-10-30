import "server-only";
import { isCronCall } from "../cron";
import { sendAppointmentReminders } from "../reminders";
import { nextApiEnabled } from "../worker";

// GET /cron/appointment-reminders (Vercel Cron, daily): the day-before reminder emails. Refused
// without `Authorization: Bearer $CRON_SECRET`. Not wrapped in ported(): it would start a second run
// of a stalled GET and answer 503 at 30s while emails are still going out. The run is safe to
// repeat (see server/reminders.ts), so a failed one waits for the next day.

const errorBody = (message: string, status: number) => Response.json({ error: message, message }, { status });

export async function runAppointmentReminderCron(req: Request): Promise<Response> {
  if (!isCronCall(req)) return errorBody("Unauthorized", 401);
  if (!nextApiEnabled()) return errorBody("API_BACKEND is not next", 503);
  try {
    const result = await sendAppointmentReminders();
    console.log("[reminders] run:", JSON.stringify(result));
    return Response.json(result);
  } catch (error) {
    console.error("[reminders] run failed:", error);
    return errorBody("The reminder run failed.", 500);
  }
}
