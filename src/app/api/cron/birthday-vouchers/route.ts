import { runBirthdayVoucherCron } from "@/server/handlers/birthdayVouchers";

export const dynamic = "force-dynamic";
// Room for several Resend batches
export const maxDuration = 60;

export const GET = runBirthdayVoucherCron;
