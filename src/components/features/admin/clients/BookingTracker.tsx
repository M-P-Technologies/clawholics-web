import { useState } from "react";
import { dateLabel, statusOf } from "@/lib/admin/clientPage";
import { appointmentToTrack, trackerSteps } from "@/lib/bookingTracker";
import type { ClientAppointment } from "@/services/clientNotesService";
import { Badge, Select } from "@/components/atoms";
import { StepTracker } from "@/components/molecules";

// Where one appointment is, from booking to the finished visit
export default function BookingTracker({ appointments, today }: { appointments: ClientAppointment[]; today: string }) {
  const [chosenId, setChosenId] = useState<number | null>(null);
  const tracked = appointments.find((a) => a.id === chosenId) ?? appointmentToTrack(appointments, today);
  if (!tracked) return <p className="text-sm text-gray-red">No bookings to track yet.</p>;
  const steps = trackerSteps(tracked);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          aria-label="Appointment to track"
          value={tracked.id}
          onChange={(e) => setChosenId(Number(e.target.value))}
          options={appointments.map((a) => ({ value: String(a.id), label: `${dateLabel(a.appointment_date)} · ${a.service_name}` }))}
          className="w-72 max-w-full"
          triggerClassName="h-9! py-0! text-[13px]"
        />
        <Badge tone={statusOf(tracked.status).tone}>{statusOf(tracked.status).label}</Badge>
      </div>

      <StepTracker label="Booking progress" steps={steps} />
    </div>
  );
}
