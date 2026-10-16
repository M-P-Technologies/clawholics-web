"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/atoms";
import { Pagination, paginate } from "@/components/molecules";
import { CARDS_PER_PAGE, CardFields, RowCard, RowCards, TableFrame } from "@/components/organisms";
import { useTableLayout } from "@/hooks/useMinWidth";
import { shortPriceLabel } from "@/lib/client/servicePrice";
import type { NailService } from "@/services/serviceService";

interface ServicesTableProps {
  services: NailService[];
  onBook: (service: NailService) => void;
  label: string;
  /** Pages the table, with a pager and a steady height (Explore, Home); without it the table shows
   *  every service it's given. The phone cards are always five a page. */
  paginateTable?: boolean;
  /** Rows a page in the paged table: ten by default (Explore), five on Home */
  rowsPerPage?: number;
  /** Pick mode (Explore, like the Admin Directory): clicking a row or its name shows the service in
   *  a panel beside the list. Without it (Home) the rows are plain: only Book does anything */
  onSelect?: (service: NailService) => void;
  /** The service showing in the panel, highlighted */
  selectedId?: number | null;
}

const cell = "border-t border-dotted border-crimson-light py-3 pr-3 align-middle";

/** Rows a page in the paged table by default (Explore); the phone cards stay CARDS_PER_PAGE (five) */
const TABLE_ROWS_PER_PAGE = 10;

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
    // Booking from the row doesn't also pick the row
    <Button type="button" aria-label={`Book ${service.name}`} onClick={(e) => { e.stopPropagation(); onBook(service); }} className="px-3! py-2! text-[13px]">
      Book
    </Button>
  );
}

// Services the way the admin lists things: a table on a computer, cards (five a page) on a phone,
// and the table paged (ten a page, or as asked) when asked. Book starts booking; in pick mode the
// name and row show the service.
export default function ServicesTable({ services, onBook, label, paginateTable = false, rowsPerPage = TABLE_ROWS_PER_PAGE, onSelect, selectedId = null }: ServicesTableProps) {
  // The name: a button that picks the service (pick mode), or plain text
  const nameControl = (service: NailService, children: ReactNode, className: string) =>
    onSelect ? (
      <button
        type="button"
        aria-pressed={service.id === selectedId}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(service);
        }}
        className={clsx(className, "cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-crimson")}
      >
        {children}
      </button>
    ) : (
      <span className={className}>{children}</span>
    );

  const asTable = useTableLayout();
  // The page belongs to one list: a different list (a new search, tab or filter) starts on page 1.
  // The table and the cards share it, so turning a tablet keeps the place.
  const listKey = services.map((s) => s.id).join(",");
  const [paged, setPaged] = useState({ listKey, page: 1 });
  const page = paged.listKey === listKey ? paged.page : 1;
  const setPage = (next: number) => setPaged({ listKey, page: next });
  const shown = paginate(services, page, rowsPerPage);

  if (!asTable) {
    const cards = paginate(services, page, CARDS_PER_PAGE);
    return (
      <>
        <RowCards label={label}>
          {cards.rows.map((service) => (
            <RowCard key={service.id} selected={onSelect !== undefined && service.id === selectedId}>
              {nameControl(
                service,
                <>
                  <Photo service={service} />
                  <span className="min-w-0 truncate font-bold">{service.name}</span>
                </>,
                "flex min-w-0 items-center gap-3",
              )}
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
        <Pagination page={cards.current} totalPages={cards.pages} onPageChange={setPage} summary={paginateTable ? cards : undefined} />
      </>
    );
  }

  return (
    <>
    <TableFrame
      label={label}
      minWidthClass="min-w-160"
      // As in the Admin Directory: grows with the card (and the panel beside it), keeping the pager at the bottom
      className={paginateTable ? "flex-1" : undefined}
      head={
        <tr className="text-left text-xs text-gray-red">
          <th scope="col" className="pb-2 pl-2 pr-3 font-medium">Service</th>
          <th scope="col" className="pb-2 pr-3 font-medium">Description</th>
          <th scope="col" className="pb-2 pr-3 text-right font-medium">Price</th>
          <th scope="col" className="pb-2 font-medium"><span className="sr-only">Book</span></th>
        </tr>
      }
    >
      {(paginateTable ? shown.rows : services).map((service) => (
        <tr
          key={service.id}
          aria-selected={onSelect ? service.id === selectedId : undefined}
          onClick={onSelect ? () => onSelect(service) : undefined}
          className={clsx(onSelect && "cursor-pointer transition-colors", onSelect && (service.id === selectedId ? "bg-crimson-light/20" : "hover:bg-crimson-light/10"))}
        >
          <th scope="row" className={`${cell} pl-2 text-left font-bold`}>
            {nameControl(
              service,
              <>
                <Photo service={service} />
                <span className="min-w-0">{service.name}</span>
              </>,
              clsx("flex min-w-0 items-center gap-3", onSelect && "hover:text-berry"),
            )}
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
      {/* A short last page keeps room for a full page of rows, so the table and the pager keep their height
          from page to page (as in the Admin Directory) */}
      {paginateTable &&
        shown.pages > 1 &&
        Array.from({ length: Math.max(0, rowsPerPage - shown.rows.length) }, (_, i) => (
          <tr key={`filler-${i}`} data-filler aria-hidden="true">
            <td colSpan={4} className="border-t border-dotted border-transparent py-3">
              <span className="block h-12" />
            </td>
          </tr>
        ))}
    </TableFrame>
    {paginateTable && <Pagination page={shown.current} totalPages={shown.pages} onPageChange={setPage} summary={shown} />}
    </>
  );
}
