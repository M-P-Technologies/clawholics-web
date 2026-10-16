import "server-only";
import { isCronCall } from "../cron";
import { sendDueScreenshotReminders } from "../screenshotReminders";
import { nextApiEnabled } from "../worker";

const errorBody = (message: string, status: number) => Response.json({ error: message, message }, { status });

// GET /cron/screenshot-reminders: Vercel Cron, daily (vercel.json). Not wrapped in ported(), like
// the birthday run: a repeated run sends nothing twice.
export async function runScreenshotReminderCron(req: Request): Promise<Response> {
  if (!isCronCall(req)) return errorBody("Unauthorized", 401);
  if (!nextApiEnabled()) return errorBody("API_BACKEND is not next", 503);
  try {
    const result = await sendDueScreenshotReminders();
    console.log("[screenshots] reminder run:", JSON.stringify(result));
    return Response.json(result);
  } catch (error) {
    console.error("[screenshots] reminder run failed:", error);
    return errorBody("The screenshot reminder run failed.", 500);
  }
}
