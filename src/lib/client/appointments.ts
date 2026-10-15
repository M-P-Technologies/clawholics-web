import type { AppointmentView } from "@/types/profile";
import type { Appointment } from "@/utils/profile";

/** The visit is done, so the client can review it */
export const isCompleted = (view: AppointmentView) => view.appt.status.trim().toUpperCase() === "COMPLETED";

/** How many visits are done, counted from every appointment (not the Past list, which is filtered and cut) */
export const completedVisits = (appointments: Appointment[]) =>
  appointments.filter((a) => a.status.trim().toUpperCase() === "COMPLETED").length;

/** The past list's status filter */
export const HISTORY_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

/** The past list's sort orders */
export const HISTORY_SORTS = [
  { value: "appointmentDateDesc", label: "Appt Date (Newest)" },
  { value: "appointmentDateAsc", label: "Appt Date (Oldest)" },
  { value: "bookingDateDesc", label: "Recently Booked" },
];
