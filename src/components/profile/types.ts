import type { Appointment } from "../../utils/profile";

/** An appointment with everything a card needs to show it (what useProfile's lists produce). */
export interface AppointmentView {
  appt: Appointment;
  displayStatus: string;
  remainingTime: number;
  isExpired: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  statusLabel: string;
  dateLabel: string;
  timeLabel: string;
  canPay: boolean;
  payLabel: string;
  isLocked: boolean;
}
