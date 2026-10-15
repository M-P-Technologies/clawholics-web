import { Check, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { dateLabel, STEP_STYLE, stepStateLabel } from "../lib/clientPage";
import { appointmentToTrack, trackerSteps } from "../../appointments/lib/bookingTracker";
import type { ClientAppointment } from "../api/clientNotesService";
import Select from "../../../components/ui/Select";
import StatusPill from "./StatusPill";

// Where one appointment is, from booking to the finished visit
export default function BookingTracker({ appointments, today }: { appointments: ClientAppointment[]; today: string }) {
  const [chosenId, setChosenId] = useState<number | null>(null);
  const tracked = appointments.find((a) => a.id === chosenId) ?? appointmentToTrack(appointments, today);
  if (!tracked) return <p className="text-sm text-gray-red/70">No bookings to track yet.</p>;
  const steps = trackerSteps(tracked);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Appointment to track"
          value={tracked.id}
          onChange={(e) => setChosenId(Number(e.target.value))}
          options={appointments.map((a) => ({ value: String(a.id), label: `${dateLabel(a.appointment_date)} · ${a.service_name}` }))}
          className="w-72 max-w-full"
          triggerClassName="!h-9 !py-0 text-[13px]"
        />
        <StatusPill status={tracked.status} />
      </div>

      <ol aria-label="Booking progress" className="flex flex-col">
        {steps.map((step, i) => {
          const style = STEP_STYLE[step.state];
          const last = i === steps.length - 1;
          return (
            <li key={step.key} aria-current={step.state === "current" ? "step" : undefined} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span aria-hidden="true" className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold", style.dot)}>
                  {step.state === "done" ? <Check size={16} strokeWidth={3} /> : step.state === "stopped" ? <X size={16} strokeWidth={3} /> : i + 1}
                </span>
                {!last && <span aria-hidden="true" className={clsx("my-1 w-1 flex-1 rounded-full", style.bar)} />}
              </div>
              <div className={clsx("grid min-w-0 flex-1 gap-x-4 gap-y-0.5 sm:grid-cols-[1fr_auto]", !last && "pb-5")}>
                <p className={clsx("text-sm font-bold", style.title)}>
                  {step.title}
                  <span className="sr-only">: {stepStateLabel(step.state)}</span>
                </p>
                {step.when && <p className="text-[12px] text-gray-red/60 sm:text-right">{step.when}</p>}
                <p className="text-[13px] text-gray-red/80 sm:col-span-2">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
