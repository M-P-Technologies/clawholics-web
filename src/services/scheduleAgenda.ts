import type { MonthlySchedule, ScheduleAppointment } from "./scheduleService";

export const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

// Monday to Sunday of the week that contains `date`
export const weekDays = (date: Date): Date[] => {
  const sinceMonday = (date.getDay() + 6) % 7;
  const monday = addDays(date, -sinceMonday);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};

// Minutes after midnight of the first "H:MM" in a time or range ("10:30-12:00"); a missing or
// unreadable time sorts last
export const startMinutes = (range: string | null | undefined): number => {
  const match = range?.match(/(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const sortByStartTime = <T extends { appointment_time?: string | null }>(items: T[]): T[] =>
  [...items].sort((a, b) => startMinutes(a.appointment_time) - startMinutes(b.appointment_time));

export const scheduleClientName = (appointment: ScheduleAppointment) =>
  appointment.client_name ||
  `${appointment.first_name ?? ""} ${appointment.last_name ?? ""}`.trim() ||
  `User #${appointment.user_id ?? ""}`;

// "YYYY-MM" of every month the week containing `date` touches, in order
export const weekMonthKeys = (date: Date): string[] =>
  [...new Set(weekDays(date).map((day) => toDateKey(day).slice(0, 7)))];

// Two months of schedule as one; everything is listed once. People, slots and the first
// month's day-offs come from `a`.
export const mergeSchedules = (a: MonthlySchedule, b: MonthlySchedule): MonthlySchedule => {
  const seenAppointments = new Set(a.appointments.map((appointment) => appointment.id));
  const seenDayOffs = new Set(a.dayOffs.map((dayOff) => JSON.stringify(dayOff)));
  return {
    ...a,
    appointments: [...a.appointments, ...b.appointments.filter((appointment) => !seenAppointments.has(appointment.id))],
    dayOffs: [...a.dayOffs, ...b.dayOffs.filter((dayOff) => !seenDayOffs.has(JSON.stringify(dayOff)))],
  };
};
