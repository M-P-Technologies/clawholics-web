import { formatSlot } from "../../utils/reschedule";

// The reschedule step's summary: the booking's old date and time, and the new ones picked ("-"
// until they are)
export const rescheduleLabels = (
  appointment: { appointment_date: string; appointment_time: string } | null,
  selectedDate: string,
  selectedTime: string,
  formatDisplayDate: (date: string) => string,
) => ({
  oldDateLabel: appointment ? formatDisplayDate(appointment.appointment_date) : "",
  oldTimeLabel: appointment ? formatSlot(appointment.appointment_time) : "",
  newDateLabel: formatDisplayDate(selectedDate) || "-",
  newTimeLabel: selectedTime ? formatSlot(selectedTime) : "-",
});
