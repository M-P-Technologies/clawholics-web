import { itemName } from "@/lib/itemName";
import { useState } from "react";
import { ConfirmDialog } from "@/components/organisms";
import { dateLabel, statusOf } from "@/lib/admin/clientPage";
import { peso } from "@/lib/dashboardFormat";
import { RESERVATION_FEE } from "@/lib/visitCompletion";
import { appointmentToTrack, trackerSteps, type TrackerStep } from "@/lib/bookingTracker";
import type { ClientAppointment } from "@/services/clientNotesService";
import { Badge, Button, Select } from "@/components/atoms";
import { StepTracker } from "@/components/molecules";
import CompleteVisitDialog from "@/components/features/admin/bookings/CompleteVisitDialog";
import CompleteVisitForm from "@/components/features/admin/bookings/CompleteVisitForm";
import ProofThumb from "@/components/features/admin/bookings/ProofThumb";

interface BookingTrackerProps {
  appointments: ClientAppointment[];
  today: string;
  /** The artists, to pick who did a visit */
  artists: { id: number; name: string }[];
  /** Marks a confirmed visit as a no-show (the downpayment is kept) */
  onNoShow: (appointmentId: number) => void;
  /** Cancels a visit the client came 25+ minutes late to (the downpayment is kept) */
  onCancelLate: (appointmentId: number) => void;
  /** The client's name, for the questions it asks ("Audit Tester didn't come…") */
  clientName?: string;
}

// Where one appointment is, from booking to the finished visit, with what the admin does at each
// step: the payment proof (when one was sent), and Complete visit (its form in a dialog) or Didn't show up
export default function BookingTracker({ appointments, today, artists, onNoShow, onCancelLate, clientName }: BookingTrackerProps) {
  const [chosenId, setChosenId] = useState<number | null>(null);
  const [asking, setAsking] = useState<"no-show" | null>(null);
  const [completing, setCompleting] = useState(false);
  const tracked = appointments.find((a) => a.id === chosenId) ?? appointmentToTrack(appointments, today);
  if (!tracked) return <p className="text-sm text-gray-red">No bookings to track yet.</p>;
  const steps = trackerSteps(tracked);
  const status = tracked.status.toUpperCase();
  const visit = {
    id: tracked.id,
    status: tracked.status,
    appointment_date: tracked.appointment_date,
    appointment_time: tracked.appointment_time,
    nailist_id: tracked.nailist_id ?? null,
    price: tracked.price,
    paid_downpayment: tracked.paid_downpayment ?? 0,
    label: `${clientName ? `${itemName(clientName, "")}'s ` : ""}${tracked.service_name} visit`,
    completion: tracked.completion ?? null,
  };

  const extra = (step: TrackerStep) => {
    if (step.key === "downpayment") {
      const proof = tracked.proof_image_url ? { id: 0, status: tracked.proof_status ?? "PENDING", image_url: tracked.proof_image_url, created_at: "" } : null;
      const paid = tracked.paid_downpayment ?? 0;
      return (
        <div className="mt-1 flex flex-col gap-1.5 text-xs text-gray-red">
          {paid > 0 && (
            <p>
              <span className="font-bold">Paid {peso(paid)}</span>
              {paid > RESERVATION_FEE && ` (${peso(RESERVATION_FEE)} reservation fee + ${peso(paid - RESERVATION_FEE)} off the service)`}
            </p>
          )}
          {/* A booking paid by payment proof; one paid online has none */}
          {proof && (
            <div className="flex items-center gap-3">
              Payment proof <ProofThumb proof={proof} appointmentId={tracked.id} />
            </div>
          )}
        </div>
      );
    }
    if (step.key === "completed" && status === "CONFIRMED") {
      const beforeDay = tracked.appointment_date > today;
      return (
        <div className="mt-1 flex flex-col gap-1.5">
          {beforeDay && <p className="text-xs font-bold text-gray-red">You can complete this visit from {dateLabel(tracked.appointment_date)}.</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="button" size="sm" disabled={beforeDay} onClick={() => setCompleting(true)}>
              Complete visit
            </Button>
            {/* From the visit's day: the client never came */}
            {!beforeDay && (
              <Button type="button" size="sm" variant="secondary" onClick={() => setAsking("no-show")}>
                Didn&apos;t show up
              </Button>
            )}
          </div>
        </div>
      );
    }
    // Completed: what was recorded, with Edit opening the dialog, and the visit's photo
    if (step.key === "completed" && status === "COMPLETED") {
      return <CompleteVisitForm key={tracked.id} visit={visit} artists={artists} onEdit={() => setCompleting(true)} />;
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

      <CompleteVisitDialog
        open={completing}
        onClose={() => setCompleting(false)}
        visit={visit}
        artists={artists}
        onCancelLate={() => onCancelLate(tracked.id)}
      />
      <ConfirmDialog
        open={asking === "no-show"}
        title="Mark as a no-show?"
        confirmLabel="Mark as no-show"
        loadingLabel="Saving…"
        onConfirm={() => {
          setAsking(null);
          onNoShow(tracked.id);
        }}
        onClose={() => setAsking(null)}
      >
        <strong>{itemName(clientName, "The client")}</strong> didn&apos;t come to their {tracked.service_name} visit on {dateLabel(tracked.appointment_date)}. By the terms the downpayment is kept, and the client page counts their no-shows.
      </ConfirmDialog>
    </div>
  );
}
