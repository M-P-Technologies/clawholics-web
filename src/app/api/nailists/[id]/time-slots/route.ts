import { getNailistTimeSlots, setNailistTimeSlots } from "@/server/handlers/nailists";

export const dynamic = "force-dynamic";

export const GET = getNailistTimeSlots;
export const PUT = setNailistTimeSlots;
