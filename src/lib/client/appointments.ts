import type { AppointmentView } from "@/types/profile";

/** The visit is done, so the client can review it */
export const isCompleted = (view: AppointmentView) => view.appt.status.trim().toUpperCase() === "COMPLETED";

/** How many of these visits are done */
export const completedVisits = (views: AppointmentView[]) => views.filter(isCompleted).length;
