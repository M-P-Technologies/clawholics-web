import Image from "next/image";
import { CalendarDays, Clock, Star } from "lucide-react";
import clsx from "clsx";
import emblem from "../../assets/logo/emblem-pink.png";
import { Button } from "@/components/atoms";
import StatusPill from "./StatusPill";
import type { AppointmentView } from "./types";

interface AppointmentCardProps {
  view: AppointmentView;
  /** The service's photo; "" shows the emblem */
  photo: string;
  onOpen: () => void;
  highlighted?: boolean;
  /** A completed visit the client hasn't reviewed yet */
  awaitingReview?: boolean;
}

/** The visit is done, so the client can review it */
export const isCompleted = (view: AppointmentView) => view.appt.status.trim().toUpperCase() === "COMPLETED";

export function AppointmentThumb({ photo, size = 64 }: { photo: string; size?: number }) {
  return (
    <span className="relative shrink-0 overflow-hidden rounded-lg bg-sand/50" style={{ width: size, height: size }}>
      {photo ? (
        <Image src={photo} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <Image src={emblem} alt="" fill sizes={`${size}px`} className="object-contain p-2" />
      )}
    </span>
  );
}

// One appointment in a list: photo, what, who, when, and its status. The whole card opens the details.
export default function AppointmentCard({ view, photo, onOpen, highlighted, awaitingReview }: AppointmentCardProps) {
  const { appt, statusLabel, statusDot, dateLabel, timeLabel } = view;
  return (
    <Button
      variant="bare"
      type="button"
      onClick={onOpen}
      aria-label={`${appt.service_name}, ${dateLabel}`}
      className={clsx(
        "flex w-full items-center gap-4 whitespace-normal rounded-xl border bg-light-orange/30 p-3 text-left transition-colors hover:border-crimson",
        highlighted ? "border-crimson ring-2 ring-crimson/30" : "border-crimson-light/50",
      )}
    >
      <AppointmentThumb photo={photo} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[15px] font-bold text-gray-red">{appt.service_name}</span>
        <span className="truncate text-[13px] text-gray-red/70">With {appt.nailist_name}</span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-red/80">
          <span className="inline-flex items-center gap-1"><CalendarDays size={14} aria-hidden="true" />{dateLabel}</span>
          <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden="true" />{timeLabel}</span>
        </span>
        {awaitingReview && (
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-berry"><Star size={14} aria-hidden="true" />Leave a review</span>
        )}
      </span>
      <StatusPill label={statusLabel} dotClass={statusDot} />
    </Button>
  );
}
