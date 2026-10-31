import PaymentProofCard from "@/components/features/client/appointments/PaymentProofCard";
import { Badge, Button, Card } from "@/components/atoms";
import { SummaryRow } from "@/components/molecules";
import { FooterActions } from "@/components/organisms";
import { statusDotTone } from "@/utils/profileView";
import { isCompleted } from "@/lib/client/appointments";
import ReviewCard from "@/components/features/client/appointments/ReviewCard";
import AddToCalendarButton from "@/components/features/client/appointments/AddToCalendarButton";
import { manilaToday } from "@/lib/bookingNotice";
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
  /** Takes a cancelled appointment out of the client's list */
  onDelete?: () => void;
  onProofUploaded: (appointmentId: number, proof: PaymentProof) => void;
  /** The client's review of this visit, once left */
  review?: Review;
  onSubmitReview: (appointmentId: number, draft: ReviewDraft) => Promise<unknown>;
  /** In a sheet: the element of its footer, where the actions are drawn (`null` while it mounts). Without it they sit under the details. */
  actionsHost?: HTMLElement | null;
}

/** Whether the appointment has any button to show (pay, reschedule, cancel) */
export const appointmentHasActions = (view: AppointmentView) => Boolean(view.canPay || view.canReschedule || view.isLocked || view.canCancel || view.canDelete);

// One appointment in full: what, who, when, its payment proof and every action that applies. Shown
// in the drawer (AppointmentSheet) and in the panel beside the Appointments list (AppointmentPanel).
export default function AppointmentDetails({ view, now, tokenFetcher, clerkId, onPay, onReschedule, onCancel, onDelete, onProofUploaded, review, onSubmitReview, actionsHost }: AppointmentDetailsProps) {
  const grow = actionsHost === undefined ? "grow" : undefined;
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

      {/* A confirmed visit still to come can go in the client's calendar */}
      {String(view.appt.status ?? "").toUpperCase() === "CONFIRMED" && view.appt.appointment_date >= manilaToday() && (
        <AddToCalendarButton
          id={view.appt.id}
          service={view.appt.service_name}
          artist={view.appt.nailist_name}
          date={view.appt.appointment_date}
          time={view.appt.appointment_time}
        />
      )}

      {isCompleted(view) && <ReviewCard appointmentId={view.appt.id} review={review} onSubmit={onSubmitReview} />}

      {view.isLocked && <p className="text-xs text-gray-red">Changes close 3 days before your appointment.</p>}

      {/* In the sheet they're in its sticky footer; in the panel they sit here, side by side while they
          fit, each at least as wide as its words, wrapping rather than shrinking */}
      {appointmentHasActions(view) && (
        <FooterActions host={actionsHost}>
          {view.canDelete && onDelete && <Button type="button" variant="secondary" onClick={onDelete} className={grow}>Delete appointment</Button>}
          {view.canCancel && <Button type="button" variant="secondary" onClick={onCancel} className={grow}>Cancel appointment</Button>}
          {(view.canReschedule || view.isLocked) && (
            <Button type="button" onClick={onReschedule} disabled={!view.canReschedule} className={grow}>Reschedule</Button>
          )}
          {view.canPay && <Button type="button" onClick={onPay} className={grow}>Complete payment ({view.payLabel})</Button>}
        </FooterActions>
      )}
    </div>
  );
}
