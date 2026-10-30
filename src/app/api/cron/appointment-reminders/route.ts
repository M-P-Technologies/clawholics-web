import { runAppointmentReminderCron } from "@/server/handlers/reminders";

export const dynamic = "force-dynamic";
// Room for several Resend batches
export const maxDuration = 60;

export const GET = runAppointmentReminderCron;
