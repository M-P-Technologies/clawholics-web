"use client";

import { Cake } from "lucide-react";
import { Button } from "@/components/atoms";
import { ctaLink } from "../../lib/homeSections";
import type { OfferBanner } from "../../lib/client/offers";

// Home's Special offers: one banner per view on a phone (swipe for more), two side by side on a computer
export default function OffersCarousel({ offers }: { offers: OfferBanner[] }) {
  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      {offers.map((offer) => {
        const link = ctaLink(offer.link, offer.buttonLabel);
        return (
          <article key={offer.key} className="relative flex min-h-40 w-[85%] shrink-0 snap-center overflow-hidden rounded-2xl bg-crimson text-milk shadow-petal lg:w-auto">
            <div className="relative z-10 flex flex-1 flex-col items-start gap-1.5 p-5">
              {offer.birthday && <Cake size={22} aria-hidden="true" />}
              <h3 className="font-display text-2xl font-normal normal-case leading-tight tracking-normal text-milk">{offer.title}</h3>
              {offer.line && <p className="text-sm text-milk/90">{offer.line}</p>}
              {offer.note && <p className="text-[12px] text-milk/75">{offer.note}</p>}
              <Button
                variant="bare"
                {...("to" in link ? { to: link.to } : { href: link.href, target: "_blank", rel: "noreferrer" })}
                className="mt-auto rounded-lg bg-milk px-4 py-1.5 text-[13px] font-bold text-crimson"
              >
                {offer.buttonLabel}
              </Button>
            </div>
            {offer.image && (
              // eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS
              <img src={offer.image} alt="" className="w-2/5 shrink-0 object-cover" />
            )}
          </article>
        );
      })}
    </div>
  );
}
