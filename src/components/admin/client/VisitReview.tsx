import type { ClientAppointment } from "../../../services/clientNotesService";
import Button from "../../ui/Button";
import { Stars } from "../../ui/StarRating";

// The client's review of a visit: its stars and comment, or a dash when there's none
export function ReviewText({ appointment }: { appointment: ClientAppointment }) {
  if (!appointment.review_rating) return <span className="text-gray-red/50">–</span>;
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <Stars rating={appointment.review_rating} size={14} />
      {appointment.review_comment && <span className="line-clamp-3 whitespace-pre-wrap text-[13px] text-gray-red/90">{appointment.review_comment}</span>}
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
