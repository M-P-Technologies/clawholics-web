import { X as XIcon } from "lucide-react";
import { formatScheduleDate, getArtistStatus, getStatusPillClass, type ArtistSchedule } from "@/lib/admin/schedule";
import { scheduleClientName } from "@/services/scheduleAgenda";
import type { ScheduleAppointment } from "@/services/scheduleService";
import { Button } from "@/components/atoms";

interface ScheduleDayDetailsProps {
  /** The day, as "YYYY-MM-DD" */
  date: string;
  artists: ArtistSchedule[];
  onClose: () => void;
  onOpenAppointment: (appointment: ScheduleAppointment) => void;
}

// One day in full: each artist, whether they're free, and their appointments
export default function ScheduleDayDetails({ date, artists, onClose, onOpenAppointment }: ScheduleDayDetailsProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-gray-red/40 px-3 py-3 lg:px-12 lg:py-9 drawer-backdrop max-sm:p-0" onClick={onClose}>
      <div
        className="max-h-[calc(100vh-32px)] w-full lg:h-full lg:w-107.5 rounded-2xl bg-milk p-3 lg:p-3 shadow-xl drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 lg:mb-9 flex items-start justify-between gap-3">
          <h3 className="max-w-[calc(100%-40px)] lg:max-w-82.5 text-xl lg:text-xl font-bold leading-tight text-gray-red">{formatScheduleDate(date)}</h3>
          <Button variant="bare" type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center shrink-0">
            <XIcon size={36} className="text-crimson" />
          </Button>
        </div>

        <div className="max-h-[calc(100vh-120px)] lg:max-h-[calc(100%-60px)] overflow-y-auto">
          {artists.map((artist) => (
            <div key={artist.id} className="mb-3">
              <div className="mb-1 flex items-center justify-between gap-3">
                <h3 className="text-lg lg:text-xl font-bold text-gray-red">{artist.name}</h3>
                <span className={`shrink-0 rounded-md px-3 py-1 text-[10px] lg:text-xs font-semibold uppercase ${getStatusPillClass(artist)}`}>{getArtistStatus(artist)}</span>
              </div>

              {artist.isDayOff ? null : artist.appointments.length === 0 ? (
                <p className="text-sm text-gray-red">No appointments for this date.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {artist.appointments.map((appointment, index) => (
                    <Button
                      variant="bare"
                      key={appointment.id ?? index}
                      type="button"
                      onClick={() => onOpenAppointment(appointment)}
                      className="flex min-h-12.5 w-full items-center justify-between rounded-xl bg-crimson-light/15 px-3 py-2 text-left transition border border-crimson-light"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="truncate text-base font-bold leading-tight text-gray-red">{scheduleClientName(appointment)}</p>
                          <span className="rounded-md border-[0.8px] px-2 py-0.5 text-xs font-bold text-gray-red">ID #{appointment.id}</span>
                        </div>
                        <p className="text-[13px] lg:text-sm leading-tight text-gray-red">
                          {appointment.service_name || "No service"} <span className="mx-1">•</span>
                          {appointment.appointment_date || date} | {appointment.appointment_time || "No time"}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
