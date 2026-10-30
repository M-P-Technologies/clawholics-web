import { getMyWaitlist, joinWaitlist } from "@/server/handlers/waitlist";

export const dynamic = "force-dynamic";

export const GET = getMyWaitlist;
export const POST = joinWaitlist;
