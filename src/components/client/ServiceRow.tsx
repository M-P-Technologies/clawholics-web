"use client";

import { Sparkles } from "lucide-react";
import { Link } from "@/lib/router";
import { Button } from "@/components/atoms";
import { serviceDetailPath } from "../../lib/client/clientNav";
import { shortPriceLabel } from "../../lib/client/servicePrice";
import type { NailService } from "../../services/serviceService";

// One service in Explore: photo, name, a line, price, and a Book button
export default function ServiceRow({ service, onBook }: { service: NailService; onBook: () => void }) {
  return (
    <li className="flex items-center gap-3 border-b border-crimson-light/40 py-3 last:border-0">
      <Link to={serviceDetailPath(service.id)} className="flex min-w-0 flex-1 items-center gap-3">
        {service.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS
          <img src={service.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
        ) : (
          <span data-testid="no-photo" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-crimson-light/30 text-crimson">
            <Sparkles size={22} aria-hidden="true" />
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-bold text-gray-red">{service.name}</span>
          <span className="line-clamp-1 text-[12px] text-gray-red/70">{service.description}</span>
          <span className="text-sm font-bold text-berry">{shortPriceLabel(service)}</span>
        </span>
      </Link>
      <Button type="button" aria-label={`Book ${service.name}`} onClick={onBook} className="!px-4 !py-2 text-[13px]">
        Book
      </Button>
    </li>
  );
}
