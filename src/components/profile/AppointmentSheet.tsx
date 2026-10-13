import PaymentProofCard from "../payment/PaymentProofCard";
import Button from "../ui/Button";
import Sheet from "../ui/Sheet";
import { AppointmentThumb, isCompleted } from "./AppointmentCard";
import ReviewCard from "./ReviewCard";
import StatusPill from "./StatusPill";
import type { AppointmentView } from "./types";
import type { PaymentProof } from "../../services/proofService";
import type { Review, ReviewDraft } from "../../services/reviewService";

interface AppointmentSheetProps {
  view: AppointmentView | null;
  photo: string;
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
export default function AppointmentSheet({ view, photo, now, tokenFetcher, clerkId, onClose, onPay, onReschedule, onCancel, onProofUploaded, review, onSubmitReview }: AppointmentSheetProps) {
  return (
    <Sheet open={view !== null} title="Appointment" onClose={onClose}>
      {view && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <AppointmentThumb photo={photo} size={72} />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="truncate text-lg font-bold text-gray-red">{view.appt.service_name}</p>
              <p className="truncate text-sm text-gray-red/70">With {view.appt.nailist_name}</p>
            </div>
            <StatusPill label={view.statusLabel} dotClass={view.statusDot} />
          </div>

          <dl className="flex flex-col divide-y divide-crimson-light/80 text-gray-red">
            <div className="flex justify-between gap-4 py-3"><dt className="label-caps">Date</dt><dd>{view.dateLabel}</dd></div>
            <div className="flex justify-between gap-4 py-3"><dt className="label-caps">Time</dt><dd>{view.timeLabel}</dd></div>
          </dl>

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
            {view.isLocked && <p className="copy-note">Changes close 3 days before your appointment.</p>}
            {view.canCancel && <Button type="button" variant="secondary" onClick={onCancel} className="w-full">Cancel appointment</Button>}
          </div>
        </div>
      )}
    </Sheet>
  );
}
