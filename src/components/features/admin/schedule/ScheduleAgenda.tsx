import { ChevronLeft, ChevronRight, Moon, Sparkles } from "lucide-react";
import clsx from "clsx";
import type { ScheduleAppointment } from "@/services/scheduleService";
import { addDays, scheduleClientName, sortByStartTime, weekDays } from "@/services/scheduleAgenda";
import { Button } from "@/components/atoms";
import { agendaTimes } from "@/lib/admin/schedule";

export interface AgendaArtist {
  id: number;
  name: string;
  appointments: ScheduleAppointment[];
  isDayOff: boolean;
}

interface ScheduleAgendaProps {
  selected: Date;
  onSelect: (date: Date) => void;
  /** The artists' day for a date, with their appointments */
  dayData: (date: Date) => AgendaArtist[];
  onOpenAppointment: (appointment: ScheduleAppointment) => void;
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

// The phone's schedule: a week strip and the selected day's appointments, grouped by artist
export default function ScheduleAgenda({ selected, onSelect, dayData, onOpenAppointment }: ScheduleAgendaProps) {
  const days = weekDays(selected);
  const today = new Date();

  const artists = dayData(selected);
  const appointments = artists.flatMap((artist) => artist.appointments);
  // The artists with bookings, each with theirs in time order
  const booked = artists
    .map((artist) => ({ ...artist, appointments: sortByStartTime(artist.appointments) }))
    .filter((artist) => artist.appointments.length > 0);
  const artistOff = artists.filter((artist) => artist.isDayOff);

  const weekday = selected.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = selected.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Week" className="flex items-center gap-1">
        <Button variant="bare" type="button" aria-label="Previous week" onClick={() => onSelect(addDays(selected, -7))} className="p-1 text-gray-red">
          <ChevronLeft size={22} aria-hidden="true" />
        </Button>

        <div className="grid min-w-0 flex-1 grid-cols-7 gap-1">
          {days.map((day) => {
            const isSelected = sameDay(day, selected);
            const hasAppointments = dayData(day).some((artist) => artist.appointments.length > 0);
            const weekday = day.toLocaleDateString("en-US", { weekday: "short" });
            return (
              <Button
                key={day.toDateString()}
                variant="bare"
                type="button"
                aria-label={`${weekday} ${day.getDate()}`}
                aria-pressed={isSelected}
                onClick={() => onSelect(day)}
                className={clsx(
                  "flex min-w-0 flex-col items-center gap-1 rounded-md py-2 text-xs transition-colors",
                  isSelected ? "bg-crimson text-on-crimson" : "text-gray-red hover:bg-crimson-light/30",
                  sameDay(day, today) && !isSelected && "ring-1 ring-crimson",
                )}
              >
                <span>{weekday}</span>
                <span className="text-base font-bold">{day.getDate()}</span>
                <span className="h-1.5">
                  {hasAppointments && (
                    <span
                      data-testid="day-dot"
                      className={clsx("block h-1.5 w-1.5 rounded-full", isSelected ? "bg-light-orange" : "bg-crimson")}
                    />
                  )}
                </span>
              </Button>
            );
          })}
        </div>

        <Button variant="bare" type="button" aria-label="Next week" onClick={() => onSelect(addDays(selected, 7))} className="p-1 text-gray-red">
          <ChevronRight size={22} aria-hidden="true" />
        </Button>
      </div>

      {/* The day: its name, the date under it and how many bookings it holds */}
      <div className="flex items-end justify-between gap-3 border-b border-crimson-light/50 pb-3">
        <h4 className="min-w-0 font-display text-2xl font-normal leading-tight text-gray-red">
          {weekday}
          <span className="block font-sans text-[13px] font-medium text-gray-red">{monthDay}</span>
        </h4>
        <span className="shrink-0 rounded-full bg-crimson-light/45 px-3 py-1 text-xs font-bold text-berry">
          {appointments.length} {appointments.length === 1 ? "booking" : "bookings"}
        </span>
      </div>

      {artistOff.length > 0 && (
        <ul aria-label="Artists off" className="flex flex-wrap gap-3">
          {artistOff.map((artist) => (
            <li key={artist.id} className="flex items-center gap-1.5 rounded-full bg-sand px-3 py-1 text-xs font-medium text-gray-red">
              <Moon size={12} aria-hidden="true" className="shrink-0" />
              <span>{artist.name} is off</span>
            </li>
          ))}
        </ul>
      )}

      {appointments.length === 0 ? (
        <p className="rounded-2xl bg-crimson-light/15 px-3 py-6 text-center text-sm text-gray-red">No appointments on this day.</p>
      ) : (
        // Grouped by artist, each with their bookings in time order
        <div className="flex flex-col gap-5">
          {booked.map((artist) => (
            <section key={artist.id} aria-label={artist.name} className="flex flex-col gap-3">
              <h5 className="flex items-center justify-between gap-3 text-base font-bold text-gray-red">
                <span className="truncate">{artist.name}</span>
                <span className="shrink-0 text-xs font-medium text-gray-red">
                  {artist.appointments.length} {artist.appointments.length === 1 ? "booking" : "bookings"}
                </span>
              </h5>
              {/* A timeline: the start (and end) time on the left, a line with a dot per booking, then its card */}
              <ol className="relative flex flex-col gap-3 before:absolute before:bottom-3 before:left-19.5 before:top-3 before:w-px before:bg-crimson-light">
                {artist.appointments.map((appointment) => {
                  const times = agendaTimes(appointment.appointment_time);
                  return (
                    <li key={appointment.id} className="relative grid grid-cols-[4.5rem_1fr] items-start gap-6">
                      <span className="pt-3 text-right leading-tight">
                        <span className="block text-sm font-bold text-berry">{times?.start ?? "No time"}</span>
                        {times?.end && <span className="block text-xs text-gray-red">{times.end}</span>}
                      </span>
                      <span aria-hidden="true" className="absolute left-18.5 top-4 h-2.5 w-2.5 rounded-full border-2 border-milk bg-crimson shadow-petal" />
                      <Button
                        variant="bare"
                        type="button"
                        onClick={() => onOpenAppointment(appointment)}
                        className="flex min-w-0 flex-col items-stretch gap-1 rounded-2xl border border-l-4 border-crimson-light/40 border-l-crimson bg-milk px-3 py-3 text-left shadow-petal transition-colors hover:bg-crimson-light/15"
                      >
                        <span className="truncate text-[15px] font-bold leading-tight text-gray-red">{scheduleClientName(appointment)}</span>
                        <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-gray-red">
                          <Sparkles size={13} aria-hidden="true" className="shrink-0 text-crimson" />
                          <span className="truncate">{appointment.service_name || "No service"}</span>
                        </span>
                      </Button>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
