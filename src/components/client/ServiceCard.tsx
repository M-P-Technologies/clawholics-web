"use client";

import { Sparkles } from "lucide-react";
import { Link } from "@/lib/router";
import { serviceDetailPath } from "../../lib/client/clientNav";
import { shortPriceLabel } from "../../lib/client/servicePrice";
import type { NailService } from "../../services/serviceService";

// A popular service on Home: photo (or an icon), name, a line, the price. Opens the service.
export default function ServiceCard({ service }: { service: NailService }) {
  const price = shortPriceLabel(service);
  return (
    <Link
      to={serviceDetailPath(service.id)}
      className="flex w-40 shrink-0 snap-start flex-col gap-2 rounded-2xl bg-milk p-3 shadow-petal transition-transform hover:-translate-y-0.5 lg:w-auto"
    >
      {service.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS
        <img src={service.image} alt="" className="h-24 w-full rounded-xl object-cover" />
      ) : (
        <span className="flex h-24 w-full items-center justify-center rounded-xl bg-crimson-light/30 text-crimson">
          <Sparkles size={28} aria-hidden="true" />
        </span>
      )}
      <span className="truncate text-sm font-bold text-gray-red">{service.name}</span>
      <span className="line-clamp-1 text-[12px] text-gray-red/70">{service.description}</span>
      <span className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-berry">{price}</span>
        <span className="rounded-full bg-crimson px-2.5 py-1 text-[11px] font-bold text-milk">Book now</span>
      </span>
    </Link>
  );
}
