import { useEffect } from "react";
import Image from "next/image";
import { startingPrice } from "../../services/pricing";
import type { NailService } from "../../services/serviceService";
import Button from "../ui/Button";

interface ServicePickerModalProps {
  open: boolean;
  /** The artist being booked, named in the heading */
  artistName: string;
  /** The services this artist offers */
  services: NailService[];
  onPick: (service: NailService) => void;
  onClose: () => void;
}

// "Book this artist" needs a service first: the booking page works out the artists, dates and
// prices from it. This lists what the artist offers; picking one goes on to the booking page.
export default function ServicePickerModal({ open, artistName, services, onPick, onClose }: ServicePickerModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-999 flex items-end sm:items-center justify-center bg-gray-red/40 px-8 backdrop-blur-sm drawer-backdrop max-sm:p-0"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-picker-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-sm border border-crimson-light bg-light-orange p-4 shadow-2xl shadow-crimson/20 md:gap-8 md:p-8 drawer-panel max-sm:min-h-[40vh] max-sm:max-w-none max-sm:rounded-t-md max-sm:rounded-b-none"
      >
        <div className="flex flex-col gap-1">
          <h2 id="service-picker-title" className="font-display text-2xl font-normal uppercase tracking-widest text-gray-red">
            Book {artistName}
          </h2>
          <p className="text-sm leading-relaxed text-gray-red/80">
            Choose a service. Next you pick a date and time, with {artistName} already selected.
          </p>
        </div>

        {services.length === 0 ? (
          <p className="text-sm text-gray-red/80">
            {artistName} has no services set up for booking yet. Please check back soon, or contact us and we will gladly help.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4">
            {services.map((service) => {
              const from = startingPrice(service);
              return (
                <li key={service.id} className="flex">
                  <Button
                    variant="bare"
                    type="button"
                    onClick={() => onPick(service)}
                    className="flex w-full flex-col items-stretch whitespace-normal overflow-hidden rounded-sm border border-crimson-light text-left transition-colors hover:border-crimson hover:bg-crimson-light/30"
                  >
                    <span className="relative block aspect-square w-full overflow-hidden bg-sand/50">
                      {service.image && (
                        <Image src={service.image} alt="" fill sizes="(max-width: 672px) 45vw, 300px" className="object-cover" />
                      )}
                    </span>
                    <span className="flex flex-1 flex-col gap-1 p-3">
                      <span className="font-bold leading-snug text-gray-red">{service.name}</span>
                      {service.duration && <span className="text-sm text-gray-red/70">{service.duration}</span>}
                      {from !== null && <span className="mt-auto pt-1 text-sm font-bold text-crimson">From ₱{from}</span>}
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <Button type="button" variant="secondary" onClick={onClose} className="w-full">
          Cancel
        </Button>
      </div>
    </div>
  );
}
