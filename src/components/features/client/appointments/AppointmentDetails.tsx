import PaymentProofCard from "@/components/features/client/appointments/PaymentProofCard";
import { Badge, Button, Card } from "@/components/atoms";
import { SummaryRow } from "@/components/molecules";
import { statusDotTone } from "@/utils/profileView";
import { isCompleted } from "@/lib/client/appointments";
import ReviewCard from "@/components/features/client/appointments/ReviewCard";
import type { AppointmentView } from "@/types/profile";
import type { PaymentProof } from "@/services/proofService";
import type { Review, ReviewDraft } from "@/services/reviewService";

export interface AppointmentDetailsProps {
  view: AppointmentView;
  now: number;
  tokenFetcher: () => Promise<string | null>;
  clerkId?: string | null;
  onPay: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onProofUploaded: (appointmentId: number, proof: PaymentProof) => void;
  /** The client's review of this visit, once left */
  review?: Review;
  onSubmitReview: (appointmentId: number, draft: ReviewDraft) => Promise<unknown>;
}

// One appointment in full: what, who, when, its payment proof and every action that applies. Shown
// in the drawer (AppointmentSheet) and in the panel beside the Appointments list (AppointmentPanel).
export default function AppointmentDetails({ view, now, tokenFetcher, clerkId, onPay, onReschedule, onCancel, onProofUploaded, review, onSubmitReview }: AppointmentDetailsProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* The name and the status share a row while they fit; the status wraps under a long name */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="wrap-break-word font-display text-xl text-berry">{view.appt.service_name}</p>
          <p className="wrap-break-word text-[13px] text-gray-red">With {view.appt.nailist_name}</p>
        </div>
        <Badge dot={statusDotTone(view.displayStatus)} caps>{view.statusLabel}</Badge>
      </div>

      <Card tone="tint" padding="sm" as="section" aria-label="Appointment details">
        <dl className="flex flex-col">
          <SummaryRow label="Artist" value={view.appt.nailist_name} />
          <SummaryRow label="Date" value={view.dateLabel} />
          <SummaryRow label="Time" value={view.timeLabel} />
          <SummaryRow label="Status" value={view.statusLabel} />
        </dl>
      </Card>

      <PaymentProofCard
        appointment={view.appt}
        now={now}
        tokenFetcher={tokenFetcher}
        clerkId={clerkId}
        onUploaded={(proof) => onProofUploaded(view.appt.id, proof)}
      />

      {isCompleted(view) && <ReviewCard appointmentId={view.appt.id} review={review} onSubmit={onSubmitReview} />}

      {/* Side by side while they fit, each at least as wide as its words; they wrap rather than shrink */}
      <div className="flex flex-wrap gap-3">
        {view.canPay && <Button type="button" onClick={onPay} className="grow">Complete payment ({view.payLabel})</Button>}
        {(view.canReschedule || view.isLocked) && (
          <Button type="button" onClick={onReschedule} disabled={!view.canReschedule} className="grow">Reschedule</Button>
        )}
        {view.canCancel && <Button type="button" variant="secondary" onClick={onCancel} className="grow">Cancel appointment</Button>}
        {view.isLocked && <p className="w-full text-xs text-gray-red">Changes close 3 days before your appointment.</p>}
      </div>
    </div>
  );
}
