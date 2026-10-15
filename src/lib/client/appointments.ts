import type { AppointmentView } from "@/types/profile";
import type { Appointment } from "@/utils/profile";

/** The visit is done, so the client can review it */
export const isCompleted = (view: AppointmentView) => view.appt.status.trim().toUpperCase() === "COMPLETED";

/** How many visits are done, counted from every appointment (not the Past list, which is filtered and cut) */
export const completedVisits = (appointments: Appointment[]) =>
  appointments.filter((a) => a.status.trim().toUpperCase() === "COMPLETED").length;
