import { useState } from "react";
import { ConfirmDialog } from "@/components/organisms";
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
  /** Confirms a booking paid online (approves its screenshot); withoutScreenshot is "Allow anyway" */
  onConfirm: (appointmentId: number, options?: { withoutScreenshot?: boolean }) => void;
  /** Marks a confirmed visit as a no-show (the downpayment is kept) */
  onNoShow: (appointmentId: number) => void;
  /** Cancels a visit the client came 25+ minutes late to (the downpayment is kept) */
  onCancelLate: (appointmentId: number) => void;
}

// Where one appointment is, from booking to the finished visit, with what the admin does at each
// step: the payment screenshot, Confirm booking, and the Complete visit form
export default function BookingTracker({ appointments, today, artists, onConfirm, onNoShow, onCancelLate }: BookingTrackerProps) {
  const [chosenId, setChosenId] = useState<number | null>(null);
  const [asking, setAsking] = useState<"allow" | "no-show" | null>(null);
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
          <div className="flex flex-wrap gap-3">
            <Button type="button" size="sm" disabled={!hasScreenshot} onClick={() => onConfirm(tracked.id)}>
              Confirm booking
            </Button>
            {/* The payment came through but the client couldn't send a screenshot */}
            {!hasScreenshot && (
              <Button type="button" size="sm" variant="secondary" onClick={() => setAsking("allow")}>
                Allow anyway
              </Button>
            )}
          </div>
        </div>
      );
    }
    if (step.key === "completed" && (status === "CONFIRMED" || status === "COMPLETED")) {
      return (
        <div className="flex flex-col gap-2">
        <CompleteVisitForm
          key={tracked.id}
          visit={{
            id: tracked.id,
            status: tracked.status,
            appointment_date: tracked.appointment_date,
            appointment_time: tracked.appointment_time,
            nailist_id: tracked.nailist_id ?? null,
            price: tracked.price,
            paid_downpayment: tracked.paid_downpayment ?? 0,
            completion: tracked.completion ?? null,
          }}
          artists={artists}
          onCancelLate={() => onCancelLate(tracked.id)}
        />
        {/* From the visit's day: the client never came */}
        {status === "CONFIRMED" && tracked.appointment_date <= today && (
          <Button type="button" size="sm" variant="secondary" onClick={() => setAsking("no-show")} className="self-start">
            Didn&apos;t show up
          </Button>
        )}
        </div>
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

      <ConfirmDialog
        open={asking === "allow"}
        title="Confirm without a screenshot?"
        confirmLabel="Confirm booking"
        loadingLabel="Confirming…"
        onConfirm={() => {
          setAsking(null);
          onConfirm(tracked.id, { withoutScreenshot: true });
        }}
        onClose={() => setAsking(null)}
      >
        Only if you&apos;ve checked that the downpayment reached the salon. The client gets the confirmation email.
      </ConfirmDialog>
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
        The client didn&apos;t come to this visit. By the terms the downpayment is kept, and the client page counts their no-shows.
      </ConfirmDialog>
    </div>
  );
}
