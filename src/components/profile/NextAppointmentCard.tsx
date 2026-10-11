import { CalendarDays, Clock } from "lucide-react";
import { relativeDay } from "../../utils/profileView";
import Button from "../ui/Button";
import { AppointmentThumb } from "./AppointmentCard";
import StatusPill from "./StatusPill";
import type { AppointmentView } from "./types";

interface NextAppointmentCardProps {
  view: AppointmentView | null;
  photo: string;
  /** Date.now(), passed in so the card counts down with the page's clock */
  now: number;
  onPay: () => void;
  onReschedule: () => void;
  onCancel: () => void;
}

// The hero of the page: the next appointment and the one thing to do about it.
export default function NextAppointmentCard({ view, photo, now, onPay, onReschedule, onCancel }: NextAppointmentCardProps) {
  if (!view) {
    return (
      <section aria-label="Next appointment" className="flex flex-col items-start gap-4 rounded-sm border border-crimson-light/80 bg-light-orange p-4 shadow-xl shadow-crimson/10 md:p-6">
        <h2 className="label-caps">Next appointment</h2>
        <p className="copy-body">You have no upcoming appointments.</p>
        <Button to="/services">Book now</Button>
      </section>
    );
  }

  const { appt, statusLabel, statusDot, dateLabel, timeLabel, canPay, payLabel, canReschedule, canCancel, isLocked } = view;
  const when = relativeDay(appt.appointment_date, appt.appointment_time, now);

  return (
    <section aria-label="Next appointment" className="flex flex-col gap-4 rounded-sm border border-crimson bg-light-orange p-4 shadow-xl shadow-crimson/10 md:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="label-caps">Next appointment</h2>
        <StatusPill label={statusLabel} dotClass={statusDot} />
      </div>

      <div className="flex items-center gap-4">
        <AppointmentThumb photo={photo} size={88} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-lg font-bold text-gray-red">{appt.service_name}</p>
          <p className="truncate text-sm text-gray-red/70">With {appt.nailist_name}</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-red/80">
            <span className="inline-flex items-center gap-1"><CalendarDays size={14} aria-hidden="true" />{dateLabel}</span>
            <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden="true" />{timeLabel}</span>
          </p>
        </div>
      </div>

      {(canPay || when) && <p className="text-sm font-bold text-crimson">{canPay ? `Pay within ${payLabel}` : when}</p>}

      <div className="flex flex-col gap-2 sm:flex-row">
        {canPay ? (
          <Button type="button" onClick={onPay} className="w-full sm:w-auto">Complete payment</Button>
        ) : (
          (canReschedule || isLocked) && (
            <Button type="button" onClick={onReschedule} disabled={!canReschedule} className="w-full sm:w-auto">Reschedule</Button>
          )
        )}
        {canCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">Cancel</Button>
        )}
      </div>
      {isLocked && <p className="copy-note">Changes close 3 days before your appointment.</p>}
    </section>
  );
}
