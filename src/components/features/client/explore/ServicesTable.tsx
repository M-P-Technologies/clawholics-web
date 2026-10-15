"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Link } from "@/lib/router";
import { Button } from "@/components/atoms";
import { Pagination, paginate } from "@/components/molecules";
import { CARDS_PER_PAGE, CardFields, RowCard, RowCards, TableFrame } from "@/components/organisms";
import { useTableLayout } from "@/hooks/useMinWidth";
import { serviceDetailPath } from "@/lib/client/clientNav";
import { shortPriceLabel } from "@/lib/client/servicePrice";
import type { NailService } from "@/services/serviceService";

interface ServicesTableProps {
  services: NailService[];
  onBook: (service: NailService) => void;
  label: string;
}

const cell = "border-t border-dotted border-crimson-light py-3 pr-3 align-middle";

function Photo({ service }: { service: NailService }) {
  return service.image ? (
    // eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS
    <img src={service.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
  ) : (
    <span data-testid="no-photo" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-crimson-light/30 text-crimson-ink">
      <Sparkles size={20} aria-hidden="true" />
    </span>
  );
}

function BookButton({ service, onBook }: { service: NailService; onBook: (s: NailService) => void }) {
  return (
    <Button type="button" aria-label={`Book ${service.name}`} onClick={() => onBook(service)} className="!px-3 !py-2 text-[13px]">
      Book
    </Button>
  );
}

// Services the way the admin lists things: a table on a computer, cards (five a page) on a phone.
// The name opens the service; Book starts booking it.
export default function ServicesTable({ services, onBook, label }: ServicesTableProps) {
  const asTable = useTableLayout();
  // The phone page belongs to one list: a different list (a new search, tab or filter) starts on page 1
  const listKey = services.map((s) => s.id).join(",");
  const [paged, setPaged] = useState({ listKey, page: 1 });
  const cardPage = paged.listKey === listKey ? paged.page : 1;
  const setCardPage = (page: number) => setPaged({ listKey, page });

  if (!asTable) {
    const cards = paginate(services, cardPage, CARDS_PER_PAGE);
    return (
      <>
        <RowCards label={label}>
          {cards.rows.map((service) => (
            <RowCard key={service.id}>
              <Link to={serviceDetailPath(service.id)} className="flex min-w-0 items-center gap-3">
                <Photo service={service} />
                <span className="min-w-0 truncate font-bold">{service.name}</span>
              </Link>
              {service.description && (
                <p data-description className="line-clamp-2 text-[13px] text-gray-red">
                  {service.description}
                </p>
              )}
              <CardFields fields={[["Price", shortPriceLabel(service)]]} />
              <div className="flex justify-end">
                <BookButton service={service} onBook={onBook} />
              </div>
            </RowCard>
          ))}
        </RowCards>
        <Pagination page={cards.current} totalPages={cards.pages} onPageChange={setCardPage} />
      </>
    );
  }

  return (
    <TableFrame
      label={label}
      minWidthClass="min-w-[640px]"
      head={
        <tr className="text-left text-[12px] text-gray-red">
          <th scope="col" className="pb-2 pr-3 font-medium">Service</th>
          <th scope="col" className="pb-2 pr-3 font-medium">Description</th>
          <th scope="col" className="pb-2 pr-3 text-right font-medium">Price</th>
          <th scope="col" className="pb-2 font-medium"><span className="sr-only">Book</span></th>
        </tr>
      }
    >
      {services.map((service) => (
        <tr key={service.id}>
          <th scope="row" className={`${cell} text-left font-bold`}>
            <Link to={serviceDetailPath(service.id)} className="flex min-w-0 items-center gap-3 hover:text-berry">
              <Photo service={service} />
              <span className="min-w-0">{service.name}</span>
            </Link>
          </th>
          <td className={`${cell} max-w-[320px] text-[13px] text-gray-red`}>
            {service.description && <span data-description className="line-clamp-2">{service.description}</span>}
          </td>
          <td className={`${cell} whitespace-nowrap text-right font-bold text-berry`}>{shortPriceLabel(service)}</td>
          <td className={`${cell} pr-0 text-right`}>
            <BookButton service={service} onBook={onBook} />
          </td>
        </tr>
      ))}
    </TableFrame>
  );
}
