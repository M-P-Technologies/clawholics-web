"use client";

import Image from "next/image";
import { Clock, Sparkles, UsersRound } from "lucide-react";
import clsx from "clsx";
import { Badge, Button } from "@/components/atoms";
import PhotoCarousel from "@/components/booking/PhotoCarousel";
import { useServicePhotoList } from "@/hooks/client/useServicePhotoList";
import { artistsFact, priceLabel } from "@/lib/client/servicePrice";
import type { NailService } from "@/services/serviceService";

interface ServicePanelProps {
  service: NailService;
  onBook: (service: NailService) => void;
  /** Inside the phone's bottom sheet: no card of its own, the sheet is the card */
  inSheet?: boolean;
  /** A card in a list: photos, category, name, price, the duration and artists, and Book, without the description */
  brief?: boolean;
  /** With `brief`: the card lies down on a phone: the photo beside the category, name, price, the duration and artists as icon rows, and Book */
  row?: boolean;
  /** With `row`: tapping the photo or the name picks the service (Explore opens its details); without it only Book does anything */
  onSelect?: (service: NailService) => void;
  /** With `row` and `onSelect`: this is the service picked */
  selected?: boolean;
}

// The duration and the artists who do the service, in a box
function ServiceFacts({ service, small = false }: { service: NailService; small?: boolean }) {
  return (
    <dl className="grid grid-cols-2 divide-x divide-crimson-light/60 rounded-xl bg-crimson-light/15 py-3 text-center">
      <div className="flex min-w-0 flex-col items-center gap-0.5 px-1">
        <dt className={clsx("flex items-center gap-1 text-gray-red", small ? "text-xs" : "text-sm")}>
          <Clock size={12} aria-hidden="true" />
          Duration
        </dt>
        <dd className={clsx("font-bold text-gray-red", small ? "text-sm" : "text-base")}>{service.duration || "Ask us"}</dd>
      </div>
      <div className="flex min-w-0 flex-col items-center gap-0.5 px-1">
        <dt className={clsx("flex items-center gap-1 text-gray-red", small ? "text-xs" : "text-sm")}>
          <UsersRound size={12} aria-hidden="true" />
          Artists
        </dt>
        <dd className={clsx("font-bold text-gray-red", small ? "text-sm" : "text-base")}>{artistsFact(service)}</dd>
      </div>
    </dl>
  );
}

// The chosen service beside the Explore list, the way the Admin Directory shows the chosen admin:
// its photos (a carousel of the main photo and the gallery), category, name and price, the facts,
// the whole description, and Book. On phones the same panel opens in a bottom sheet (`inSheet`).
export default function ServicePanel({ service, onBook, inSheet = false, brief = false, row = false, onSelect, selected = false }: ServicePanelProps) {
  const photos = useServicePhotoList(service);

  if (brief && row) {
    return (
      <article aria-label={`${service.name} details`} className={clsx("flex min-w-0 gap-3 overflow-clip rounded-2xl border bg-milk p-3 shadow-petal", selected ? "border-crimson" : "border-crimson-light/40")}>
        {/* The photo picks the service too; the name is its button for the keyboard and screen readers */}
        <button type="button" tabIndex={-1} aria-hidden="true" disabled={!onSelect} onClick={() => onSelect?.(service)} className="relative aspect-3/4 w-2/5 shrink-0 cursor-pointer overflow-hidden rounded-xl bg-crimson-light/30 disabled:cursor-default">
          {photos[0] ? (
            <Image src={photos[0].image_url} alt="" fill sizes="40vw" className="object-cover" />
          ) : (
            <span data-testid="no-photo" className="flex h-full w-full items-center justify-center text-crimson-ink">
              <Sparkles size={32} aria-hidden="true" />
            </span>
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          {service.category && <Badge tone="brand">{service.category}</Badge>}
          <h2 className="font-display text-xl font-normal leading-tight text-gray-red">
            {onSelect ? (
              <button type="button" aria-pressed={selected} onClick={() => onSelect(service)} className="cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-crimson">
                {service.name}
              </button>
            ) : (
              service.name
            )}
          </h2>
          <p className="text-sm font-bold text-crimson">{priceLabel(service)}</p>
          {service.description && <p className="line-clamp-3 text-sm text-gray-red sm:line-clamp-5">{service.description}</p>}
          {/* The duration and Book on one row at the card's foot */}
          <div className="mt-auto flex w-full items-center justify-between gap-3 pt-1.5">
            <p className="flex items-center gap-1.5 text-sm text-gray-red">
              <Clock size={12} aria-hidden="true" className="shrink-0" />
              <span className="sr-only">Duration: </span>
              {service.duration || "Ask us"}
            </p>
            <Button type="button" onClick={() => onBook(service)}>
              Book now
            </Button>
          </div>
        </div>
      </article>
    );
  }

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
          {/* Tighter between the name and the price on a list card */}
          <div className={clsx("flex flex-col lg:w-full lg:flex-row lg:flex-wrap lg:items-baseline lg:justify-between lg:gap-x-3", brief ? "gap-0.5" : "gap-3")}>
            <h2 className={clsx("font-display font-normal leading-tight text-gray-red", brief ? "text-xl" : "text-2xl")}>{service.name}</h2>
            <p className={clsx("font-display text-crimson", brief ? "text-lg" : "text-xl")}>{priceLabel(service)}</p>
          </div>
        </div>

        <ServiceFacts service={service} small={brief} />

        {/* A list card shows the first lines of the description; the panel and the sheet show it all */}
        {brief && service.description && <p className="line-clamp-5 text-sm text-gray-red">{service.description}</p>}

        {!brief && service.description && <p className="whitespace-pre-line text-sm leading-relaxed text-gray-red">{service.description}</p>}

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
