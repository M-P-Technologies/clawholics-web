import { toDateKey } from "../../services/scheduleAgenda";
import type { MonthlySchedule, NailArtist, ScheduleAppointment } from "../../services/scheduleService";
import { isOverlapping } from "../../utils/reschedule";

// The admin Schedule screen's date helpers and what each artist's day holds

/** One artist's day: their appointments, time slots and whether they're off */
export interface ArtistSchedule {
  id: number;
  name: string;
  appointments: ScheduleAppointment[];
  isDayOff: boolean;
  slotCount: number;
  timeSlots: string[];
  unavailableSlotCount: number;
}

/** "2026-10-20" as a local date, or null when it isn't one */
export const parseLocalDate = (dateString: string) => {
  const parts = dateString.split("-").map(Number);
  if (parts.length !== 3) return null;
  const [year, monthValue, day] = parts;
  if (!year || !monthValue || !day) return null;
  const parsedDate = new Date(year, monthValue - 1, day);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

/** "2026-10-20" → "Tuesday | October 20, 2026" (the text itself when it isn't a date) */
export const formatScheduleDate = (dateString: string) => {
  const parsedDate = parseLocalDate(dateString);
  if (!parsedDate) return dateString;
  const weekday = parsedDate.toLocaleDateString("en-US", { weekday: "long" });
  const fullDate = parsedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${weekday} | ${fullDate}`;
};

/** A date's month as the schedule API takes it: "2026-10" */
export const formatLocalMonth = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** "October 2026" */
export const monthLabel = (month: Date) => month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

/** The date of a react-day-picker Day cell (its props changed shape between versions), at midnight */
export const getDayPickerDate = (props: { day?: { date?: unknown }; date?: unknown }) => {
  const possibleDate = props?.day?.date instanceof Date ? props.day.date : props?.date instanceof Date ? props.date : null;
  if (!possibleDate || Number.isNaN(possibleDate.getTime())) return null;
  return new Date(possibleDate.getFullYear(), possibleDate.getMonth(), possibleDate.getDate());
};

/** Before today */
export const isPastDay = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day < today;
};

export const getArtistName = (artist: NailArtist) => artist.name || `${artist.first_name ?? ""} ${artist.last_name ?? ""}`.trim() || "Artist";

const isFullyBooked = (artist: ArtistSchedule) => artist.slotCount > 0 && artist.appointments.length >= artist.slotCount;

export const getArtistStatus = (artist: ArtistSchedule) => (artist.isDayOff ? "Day Off" : isFullyBooked(artist) ? "Fully Booked" : "Available");

export const getStatusPillClass = (artist: ArtistSchedule) => {
  const status = getArtistStatus(artist);
  if (status === "Fully Booked") return "bg-danger/20 text-danger";
  if (status === "Available") return "bg-success/20 text-success";
  return "bg-gray-red/20 text-gray-red/70";
};

export const getDayDotColor = (artist: ArtistSchedule) => (artist.isDayOff ? "bg-gray-red/50" : isFullyBooked(artist) ? "bg-danger" : "bg-success");

// A slot on today's date that has already started
const isPastTimeForDate = (slot: string, dateStr: string) => {
  const date = parseLocalDate(dateStr);
  if (!date) return false;
  const now = new Date();
  if (date.toDateString() !== now.toDateString()) return false;
  const [hour, minute] = slot.split("-")[0].split(":").map(Number);
  return hour * 60 + minute <= now.getHours() * 60 + now.getMinutes();
};

/** Each artist's day on a date ("All", or only the artist with that name) */
export function buildDayData(schedule: MonthlySchedule | null, date: Date, artistFilter: string): ArtistSchedule[] {
  if (!schedule) return [];
  const dateStr = toDateKey(date);
  const dayOfWeek = date.getDay();

  return schedule.nailists
    .filter((artist) => artistFilter === "All" || getArtistName(artist) === artistFilter)
    .map((artist) => {
      const mine = (row: { nailist_id?: number | string | null }) => Number(row.nailist_id) === Number(artist.id);
      const appointments = schedule.appointments.filter((appointment) => mine(appointment) && appointment.appointment_date === dateStr);
      const isDayOff = schedule.dayOffs.some(
        (dayOff) =>
          mine(dayOff) &&
          ((dayOff.day_off_type === "CUSTOM" && dayOff.date === dateStr) || (dayOff.day_off_type === "REGULAR" && Number(dayOff.day_of_week) === dayOfWeek)),
      );
      const timeSlots = schedule.timeSlots?.filter(mine).map((slot) => `${slot.start_time}-${slot.end_time}`) ?? [];
      const unavailableSlotCount = timeSlots.filter(
        (slot) =>
          appointments.some((appointment) => (appointment.appointment_time ? isOverlapping(appointment.appointment_time, slot) : false)) ||
          isPastTimeForDate(slot, dateStr),
      ).length;

      return { id: artist.id, name: getArtistName(artist), appointments, isDayOff, slotCount: timeSlots.length, timeSlots, unavailableSlotCount };
    });
}

const short = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** A week's heading: "Oct 12 – 18, 2026", naming both months or years when it crosses them */
export function weekLabel(days: Date[]) {
  const [start, end] = [days[0], days[6]];
  if (start.getFullYear() !== end.getFullYear()) return `${short(start)}, ${start.getFullYear()} – ${short(end)}, ${end.getFullYear()}`;
  if (start.getMonth() !== end.getMonth()) return `${short(start)} – ${short(end)}, ${end.getFullYear()}`;
  return `${short(start)} – ${end.getDate()}, ${end.getFullYear()}`;
}

/** The services booked in the loaded schedule, in order, for the filter */
export const serviceNamesOf = (schedule: MonthlySchedule | null) =>
  [...new Set((schedule?.appointments ?? []).map((a) => a.service_name).filter(Boolean))].sort();
