import type { Appointment } from "../../services/appointmentService";

// A walk-in: flagged, or booked on the shared walk-in guest account. They have no client page.
export const WALKIN_EMAIL = "walkin-guest@clawholics.local";
export const isWalkin = (a: Pick<Appointment, "is_walkin" | "email">) =>
  Boolean(a.is_walkin) || (a.email ?? "").trim().toLowerCase() === WALKIN_EMAIL;
