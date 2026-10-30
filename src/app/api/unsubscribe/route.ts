import { unsubscribeNudges } from "@/server/handlers/unsubscribe";

export const dynamic = "force-dynamic";

// The link in a rebooking email (GET) and the one-click unsubscribe mail apps send (POST)
export const GET = unsubscribeNudges;
export const POST = unsubscribeNudges;
