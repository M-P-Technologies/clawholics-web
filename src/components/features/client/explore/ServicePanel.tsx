"use client";

import { Clock, Sparkles, UsersRound } from "lucide-react";
import clsx from "clsx";
import { Badge, Button } from "@/components/atoms";
import PhotoCarousel from "@/components/booking/PhotoCarousel";
import ServiceOptions from "@/components/booking/ServiceOptions";
import { useServicePhotoList } from "@/hooks/client/useServicePhotoList";
import { artistsFact, priceLabel } from "@/lib/client/servicePrice";
import type { NailService } from "@/services/serviceService";

interface ServicePanelProps {
  service: NailService;
  onBook: (service: NailService) => void;
  /** Inside the phone's bottom sheet: no card of its own, the sheet is the card */
  inSheet?: boolean;
}

// The chosen service beside the Explore list, the way the Admin Directory shows the chosen admin:
// its photos (a carousel of the main photo and the gallery), category, name and price, the facts,
// the whole description, and Book. On phones the same panel opens in a bottom sheet (`inSheet`).
export default function ServicePanel({ service, onBook, inSheet = false }: ServicePanelProps) {
  const photos = useServicePhotoList(service);
  return (
    <aside
      aria-label={`${service.name} details`}
      className={clsx(
        "flex min-w-0 flex-col",
        inSheet ? "gap-3 [&>:first-child]:overflow-clip [&>:first-child]:rounded-xl" : "overflow-clip rounded-2xl border border-crimson-light/40 bg-milk shadow-petal lg:h-full",
      )}
    >
      {photos.length ? (
        <PhotoCarousel photos={photos} label={service.name} aspect="aspect-video" framed={false} arrows sizes="(max-width: 1024px) 100vw, 33vw" />
      ) : (
        <span className="flex aspect-video w-full shrink-0 items-center justify-center bg-crimson-light/30 text-crimson-ink">
          <Sparkles size={32} aria-hidden="true" />
        </span>
      )}

      <div className={clsx("flex flex-1 flex-col gap-3", !inSheet && "px-6 pb-6 pt-3")}>
        <div className="flex flex-col items-start gap-3">
          {service.category && <Badge tone="brand">{service.category}</Badge>}
          <h2 className="font-display text-2xl font-normal leading-tight text-gray-red">{service.name}</h2>
          <p className="font-display text-xl text-berry">{priceLabel(service)}</p>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-crimson-light/60 rounded-xl bg-crimson-light/15 py-3 text-center">
          <div className="flex min-w-0 flex-col items-center gap-0.5 px-1">
            <dt className="flex items-center gap-1 text-xs text-gray-red">
              <Clock size={12} aria-hidden="true" />
              Duration
            </dt>
            <dd className="text-sm font-bold text-gray-red">{service.duration || "Ask us"}</dd>
          </div>
          <div className="flex min-w-0 flex-col items-center gap-0.5 px-1">
            <dt className="flex items-center gap-1 text-xs text-gray-red">
              <UsersRound size={12} aria-hidden="true" />
              Artists
            </dt>
            <dd className="text-sm font-bold text-gray-red">{artistsFact(service)}</dd>
          </div>
        </dl>

        {service.description && <p className="whitespace-pre-line text-sm leading-relaxed text-gray-red">{service.description}</p>}

        <ServiceOptions options={service.variants} headingClassName="text-sm font-bold" />

        {/* In the phone's sheet, Book is the sheet's footer instead (kept below the part that scrolls) */}
        {!inSheet && (
          <div className="mt-auto pt-3">
            <Button type="button" onClick={() => onBook(service)} className="w-full">
              Book now
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
