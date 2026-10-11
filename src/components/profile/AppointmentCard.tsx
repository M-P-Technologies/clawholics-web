import Image from "next/image";
import { CalendarDays, Clock } from "lucide-react";
import clsx from "clsx";
import emblem from "../../assets/logo/emblem-pink.png";
import Button from "../ui/Button";
import StatusPill from "./StatusPill";
import type { AppointmentView } from "./types";

interface AppointmentCardProps {
  view: AppointmentView;
  /** The service's photo; "" shows the emblem */
  photo: string;
  onOpen: () => void;
  highlighted?: boolean;
}

export function AppointmentThumb({ photo, size = 64 }: { photo: string; size?: number }) {
  return (
    <span className="relative shrink-0 overflow-hidden rounded-sm bg-sand/50" style={{ width: size, height: size }}>
      {photo ? (
        <Image src={photo} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <Image src={emblem} alt="" fill sizes={`${size}px`} className="object-contain p-2" />
      )}
    </span>
  );
}

// One appointment in a list: photo, what, who, when, and its status. The whole card opens the details.
export default function AppointmentCard({ view, photo, onOpen, highlighted }: AppointmentCardProps) {
  const { appt, statusLabel, statusDot, dateLabel, timeLabel } = view;
  return (
    <Button
      variant="bare"
      type="button"
      onClick={onOpen}
      aria-label={`${appt.service_name}, ${dateLabel}`}
      className={clsx(
        "flex w-full items-center gap-4 whitespace-normal rounded-sm border bg-light-orange p-3 text-left shadow-xl shadow-crimson/10 transition-colors hover:border-crimson md:p-4",
        highlighted ? "border-crimson ring-2 ring-crimson/30" : "border-crimson-light/80",
      )}
    >
      <AppointmentThumb photo={photo} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-base font-bold text-gray-red">{appt.service_name}</span>
        <span className="truncate text-sm text-gray-red/70">With {appt.nailist_name}</span>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-red/80">
          <span className="inline-flex items-center gap-1"><CalendarDays size={14} aria-hidden="true" />{dateLabel}</span>
          <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden="true" />{timeLabel}</span>
        </span>
      </span>
      <StatusPill label={statusLabel} dotClass={statusDot} />
    </Button>
  );
}
