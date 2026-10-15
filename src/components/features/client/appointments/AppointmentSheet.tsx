import PaymentProofCard from "@/components/features/client/appointments/PaymentProofCard";
import { Badge, Button, Card } from "@/components/atoms";
import { SummaryRow } from "@/components/molecules";
import { statusDotTone } from "@/utils/profileView";
import { Dialog } from "@/components/organisms";
import { isCompleted } from "@/lib/client/appointments";
import ReviewCard from "@/components/features/client/appointments/ReviewCard";
import type { AppointmentView } from "@/types/profile";
import type { PaymentProof } from "@/services/proofService";
import type { Review, ReviewDraft } from "@/services/reviewService";

interface AppointmentSheetProps {
  view: AppointmentView | null;
  now: number;
  tokenFetcher: () => Promise<string | null>;
  clerkId?: string | null;
  onClose: () => void;
  onPay: () => void;
  onReschedule: () => void;
  onCancel: () => void;
  onProofUploaded: (appointmentId: number, proof: PaymentProof) => void;
  /** The client's review of this visit, once left */
  review?: Review;
  onSubmitReview: (appointmentId: number, draft: ReviewDraft) => Promise<unknown>;
}

// One appointment in full: what, who, when, its payment proof and every action that applies.
export default function AppointmentSheet({ view, now, tokenFetcher, clerkId, onClose, onPay, onReschedule, onCancel, onProofUploaded, review, onSubmitReview }: AppointmentSheetProps) {
  return (
    <Dialog open={view !== null} title="Appointment" onClose={onClose} placement="drawer">
      {view && (
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="break-words font-display text-xl text-berry">{view.appt.service_name}</p>
              <p className="break-words text-[13px] text-gray-red/70">With {view.appt.nailist_name}</p>
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

          <div className="flex flex-col gap-2">
            {view.canPay && <Button type="button" onClick={onPay} className="w-full">Complete payment ({view.payLabel})</Button>}
            {(view.canReschedule || view.isLocked) && (
              <Button type="button" onClick={onReschedule} disabled={!view.canReschedule} className="w-full">Reschedule</Button>
            )}
            {view.isLocked && <p className="text-[12px] text-gray-red/60">Changes close 3 days before your appointment.</p>}
            {view.canCancel && <Button type="button" variant="secondary" onClick={onCancel} className="w-full">Cancel appointment</Button>}
          </div>
        </div>
      )}
    </Dialog>
  );
}
