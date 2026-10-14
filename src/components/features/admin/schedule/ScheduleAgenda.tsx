import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { ScheduleAppointment } from "@/services/scheduleService";
import { addDays, scheduleClientName, sortByStartTime, weekDays } from "@/services/scheduleAgenda";
import { Button } from "@/components/atoms";

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

// The phone's schedule: a week strip and the selected day's appointments in time order
export default function ScheduleAgenda({ selected, onSelect, dayData, onOpenAppointment }: ScheduleAgendaProps) {
  const days = weekDays(selected);
  const today = new Date();

  const artists = dayData(selected);
  const appointments = sortByStartTime(artists.flatMap((artist) => artist.appointments));
  const artistOff = artists.filter((artist) => artist.isDayOff);

  const dayTitle = selected.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col gap-4">
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
                  "flex min-w-0 flex-col items-center gap-1 rounded-md py-2 text-[11px] transition-colors",
                  isSelected ? "bg-crimson text-light-orange" : "text-gray-red hover:bg-crimson-light/30",
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

      <h4 className="font-display text-lg uppercase tracking-widest text-gray-red">{dayTitle}</h4>

      {artistOff.map((artist) => (
        <p key={artist.id} className="text-sm text-gray-red/70">
          {artist.name} is off
        </p>
      ))}

      {appointments.length === 0 ? (
        <p className="text-sm text-gray-red/70">No appointments on this day.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <Button
                variant="bare"
                type="button"
                onClick={() => onOpenAppointment(appointment)}
                className="flex w-full items-start gap-4 rounded-2xl border border-crimson-light/40 bg-milk px-4 py-3 shadow-petal text-left"
              >
                <span className="w-24 shrink-0 text-sm font-bold text-crimson">{appointment.appointment_time || "No time"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold uppercase leading-tight text-gray-red">
                    {scheduleClientName(appointment)}
                  </span>
                  <span className="block truncate text-[13px] text-gray-red">
                    {appointment.service_name || "No service"} · {appointment.nailist_name}
                  </span>
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
