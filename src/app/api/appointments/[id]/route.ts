import { deleteCancelledAppointment, getAppointmentById } from "@/server/handlers/booking";

// Alias of /booking/appointments/:id
export const dynamic = "force-dynamic";

export const GET = getAppointmentById;
export const DELETE = deleteCancelledAppointment;
