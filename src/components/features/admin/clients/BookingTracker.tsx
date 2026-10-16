import { useState } from "react";
import { dateLabel, statusOf } from "@/lib/admin/clientPage";
import { appointmentToTrack, trackerSteps, type TrackerStep } from "@/lib/bookingTracker";
import type { ClientAppointment } from "@/services/clientNotesService";
import { Badge, Button, Select } from "@/components/atoms";
import { StepTracker } from "@/components/molecules";
import CompleteVisitForm from "@/components/features/admin/bookings/CompleteVisitForm";
import ProofThumb from "@/components/features/admin/bookings/ProofThumb";

interface BookingTrackerProps {
  appointments: ClientAppointment[];
  today: string;
  /** The artists, to pick who did a visit */
  artists: { id: number; name: string }[];
  /** Confirms a booking paid online (approves its screenshot) */
  onConfirm: (appointmentId: number) => void;
}

// Where one appointment is, from booking to the finished visit, with what the admin does at each
// step: the payment screenshot, Confirm booking, and the Complete visit form
export default function BookingTracker({ appointments, today, artists, onConfirm }: BookingTrackerProps) {
  const [chosenId, setChosenId] = useState<number | null>(null);
  const tracked = appointments.find((a) => a.id === chosenId) ?? appointmentToTrack(appointments, today);
  if (!tracked) return <p className="text-sm text-gray-red">No bookings to track yet.</p>;
  const steps = trackerSteps(tracked);
  const status = tracked.status.toUpperCase();
  const hasScreenshot = tracked.proof_status === "PENDING" || tracked.proof_status === "APPROVED";

  const extra = (step: TrackerStep) => {
    if (step.key === "downpayment") {
      const proof = tracked.proof_image_url ? { id: 0, status: tracked.proof_status ?? "PENDING", image_url: tracked.proof_image_url, created_at: "" } : null;
      return (
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-red">
          Payment screenshot <ProofThumb proof={proof} appointmentId={tracked.id} />
        </div>
      );
    }
    if (step.key === "confirmed" && status === "AWAITING_CONFIRMATION") {
      return (
        <div className="mt-1 flex flex-col gap-1.5">
          {!hasScreenshot && <p className="text-xs font-bold text-warning-ink">Waiting for the client&apos;s payment screenshot.</p>}
          <Button type="button" size="sm" disabled={!hasScreenshot} onClick={() => onConfirm(tracked.id)} className="self-start">
            Confirm booking
          </Button>
        </div>
      );
    }
    if (step.key === "completed" && (status === "CONFIRMED" || status === "COMPLETED")) {
      return (
        <CompleteVisitForm
          key={tracked.id}
          visit={{
            id: tracked.id,
            status: tracked.status,
            appointment_date: tracked.appointment_date,
            nailist_id: tracked.nailist_id ?? null,
            price: tracked.price,
            paid_downpayment: tracked.paid_downpayment ?? 0,
            completion: tracked.completion ?? null,
          }}
          artists={artists}
        />
      );
    }
    return null;
  };

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

      <StepTracker label="Booking progress" steps={steps} renderExtra={extra} />
    </div>
  );
}
