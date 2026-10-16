import { runScreenshotReminderCron } from "@/server/handlers/screenshotReminders";

export const dynamic = "force-dynamic";
// Room for several Resend batches
export const maxDuration = 60;

export const GET = runScreenshotReminderCron;
