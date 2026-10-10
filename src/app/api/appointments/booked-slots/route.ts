import { getBookedSlots } from "@/server/handlers/booking";

// Alias of /booking/slots-detailed
export const dynamic = "force-dynamic";

export const GET = getBookedSlots;
