"use client";

import { useState } from "react";
import clsx from "clsx";
import { Badge, Button } from "@/components/atoms";
import { Pagination, paginate } from "@/components/molecules";
import { CARDS_PER_PAGE, CardFields, RowCard, RowCards, TableFrame } from "@/components/organisms";
import { useTableLayout } from "@/hooks/useMinWidth";
import { useFitRows } from "@/hooks/useFitRows";
import { isCompleted } from "@/lib/client/appointments";
import { statusDotTone } from "@/utils/profileView";
import type { AppointmentView } from "@/types/profile";

interface AppointmentsTableProps {
  views: AppointmentView[];
  highlightedId: number | null;
  /** The appointments the client has reviewed */
  reviewedIds: ReadonlySet<number>;
  onOpen: (view: AppointmentView) => void;
  label: string;
  /** The appointment showing in the panel beside the list (computers): its row is marked, and
   *  clicking a row opens it there, as in Explore */
  selectedId?: number | null;
}

const cell = "border-t border-dotted border-crimson-light py-3 pr-3 align-middle";

function Status({ view, reviewedIds }: { view: AppointmentView; reviewedIds: ReadonlySet<number> }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge dot={statusDotTone(view.displayStatus)} caps>{view.statusLabel}</Badge>
      {isCompleted(view) && !reviewedIds.has(view.appt.id) && <Badge tone="brand">Leave a review</Badge>}
    </span>
  );
}

// The client's appointments the way the admin lists them: a table on a computer, paged with as many
// rows as fit beside the panel (at least five), and cards (five a page) on a phone. In the table the
// row (or its service name, a button for keyboards) shows the appointment's details; a card has an
// Open button.
export default function AppointmentsTable({ views, highlightedId, reviewedIds, onOpen, label, selectedId }: AppointmentsTableProps) {
  const asTable = useTableLayout();
  // The page belongs to one list: a different list (a new tab or filter) starts on page 1. The
  // table and the cards share it, so turning a tablet keeps the place.
  const listKey = views.map((v) => v.appt.id).join(",");
  const [paged, setPaged] = useState({ listKey, page: 1 });
  const cardPage = paged.listKey === listKey ? paged.page : 1;
  const setCardPage = (page: number) => setPaged({ listKey, page });
  const { ref: fitRef, rows: fitRows, style: fitStyle } = useFitRows(CARDS_PER_PAGE, asTable);
  const shown = paginate(views, cardPage, fitRows);
  const open = (view: AppointmentView) => (
    <Button
      size="sm"
      type="button"
      variant="secondary"
      aria-label={`Open ${view.appt.service_name}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(view);
      }}
    >
      Open
    </Button>
  );

  if (!asTable) {
    const cards = paginate(views, cardPage, CARDS_PER_PAGE);
    return (
      <>
        <RowCards label={label}>
          {cards.rows.map((view) => (
            <RowCard key={view.appt.id} selected={view.appt.id === highlightedId}>
              <span className="min-w-0 wrap-break-word font-bold">{view.appt.service_name}</span>
              <CardFields fields={[["Artist", view.appt.nailist_name], ["Date", view.dateLabel], ["Time", view.timeLabel]]} />
              {/* The status and Open in one row at the bottom */}
              <div className="flex items-center justify-between gap-3">
                <Status view={view} reviewedIds={reviewedIds} />
                {open(view)}
              </div>
            </RowCard>
          ))}
        </RowCards>
        <Pagination page={cards.current} totalPages={cards.pages} onPageChange={setCardPage} />
      </>
    );
  }

  return (
    <>
    {/* As tall as the card lets it be (the pager stays at the bottom), the table placed inside it */}
    <div ref={fitRef} className="relative min-h-0 flex-1" style={fitStyle}>
    <TableFrame
      label={label}
      minWidthClass="min-w-180"
      className="absolute inset-0 overflow-y-hidden"
      head={
        <tr className="text-left text-xs text-gray-red">
          {["Service", "Artist", "Date", "Time", "Status"].map((h) => (
            <th key={h} scope="col" className="pb-2 pr-3 font-medium">{h}</th>
          ))}
        </tr>
      }
    >
      {shown.rows.map((view) => {
        const highlighted = view.appt.id === highlightedId;
        const picking = selectedId !== undefined;
        const selected = picking && view.appt.id === selectedId;
        return (
          <tr
            key={view.appt.id}
            data-highlighted={highlighted || undefined}
            aria-selected={picking ? selected : undefined}
            onClick={() => onOpen(view)}
            className={clsx(
              "cursor-pointer transition-colors",
              highlighted || selected ? "bg-crimson-light/20" : "hover:bg-crimson-light/10",
            )}
          >
            <th scope="row" className={clsx(cell, "text-left font-bold")}>
              <button
                type="button"
                aria-label={`Open ${view.appt.service_name}`}
                aria-pressed={picking ? selected : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(view);
                }}
                className="cursor-pointer text-left hover:text-berry focus-visible:outline-2 focus-visible:outline-crimson"
              >
                {view.appt.service_name}
              </button>
            </th>
            <td className={cell}>{view.appt.nailist_name}</td>
            <td className={cell}>{view.dateLabel}</td>
            <td className={cell}>{view.timeLabel}</td>
            <td className={clsx(cell, "pr-0")}><Status view={view} reviewedIds={reviewedIds} /></td>
          </tr>
        );
      })}
      {/* A short last page keeps room for a full page, so the pager stays put from page to page */}
      {shown.pages > 1 &&
        Array.from({ length: Math.max(0, fitRows - shown.rows.length) }, (_, i) => (
          <tr key={`filler-${i}`} data-filler aria-hidden="true">
            <td colSpan={5} className="border-t border-dotted border-transparent py-3">
              <span className="block h-7" />
            </td>
          </tr>
        ))}
    </TableFrame>
    </div>
    <Pagination page={shown.current} totalPages={shown.pages} onPageChange={setCardPage} summary={shown} />
    </>
  );
}
