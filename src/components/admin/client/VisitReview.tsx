import type { ClientAppointment } from "../../../services/clientNotesService";
import { Button, Stars } from "@/components/atoms";

interface ReviewTextProps {
  appointment: ClientAppointment;
  busy?: boolean;
  /** Shows the review on the home page, or takes it off */
  onApprove?: (reviewId: number, approved: boolean) => void;
}

// The client's review of a visit: its stars and comment, whether the home page shows it, and
// the button that decides that. A dash when there's no review.
export function ReviewText({ appointment, busy = false, onApprove }: ReviewTextProps) {
  if (!appointment.review_rating) return <span className="text-gray-red/50">–</span>;
  const { review_id: reviewId } = appointment;
  const approved = appointment.review_approved === 1;
  return (
    <span className="flex min-w-0 flex-col items-start gap-1">
      <Stars rating={appointment.review_rating} size={14} />
      {appointment.review_comment && <span className="line-clamp-3 whitespace-pre-wrap text-[13px] text-gray-red/90">{appointment.review_comment}</span>}
      {onApprove && reviewId != null && (
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${approved ? "bg-success/20 text-gray-red" : "bg-sand text-gray-red"}`}>
            {approved ? "On the home page" : "Not on the home page"}
          </span>
          <Button type="button" variant="bare" disabled={busy} onClick={() => onApprove(reviewId, !approved)} className="text-[12px] font-bold text-berry underline disabled:opacity-50">
            {approved ? "Take it off" : "Approve for the home page"}
          </Button>
        </span>
      )}
    </span>
  );
}

// The photo the client added to their review, as a thumbnail that opens it big
export function ReviewPhoto({ appointment, onOpen }: { appointment: ClientAppointment; onOpen: (url: string) => void }) {
  const url = appointment.review_photo_url;
  if (!url) return <span className="text-gray-red/50">–</span>;
  return (
    <Button type="button" variant="bare" onClick={() => onOpen(url)} aria-label="View review photo" className="block h-12 w-12 overflow-hidden rounded-md border border-crimson-light/60">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-full w-full object-cover" />
    </Button>
  );
}
