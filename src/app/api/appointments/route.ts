import { listAllAppointments } from "@/server/handlers/booking";

// Alias of /booking/appointments
export const dynamic = "force-dynamic";

export const GET = listAllAppointments;
