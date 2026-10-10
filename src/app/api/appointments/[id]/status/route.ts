import { updateAppointmentStatus } from "@/server/handlers/booking";

// Alias of /booking/appointments/:id/status
export const dynamic = "force-dynamic";

export const PATCH = updateAppointmentStatus;
