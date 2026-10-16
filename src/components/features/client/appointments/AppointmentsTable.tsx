"use client";

import { useState } from "react";
import clsx from "clsx";
import { Badge, Button } from "@/components/atoms";
import { Pagination, paginate } from "@/components/molecules";
import { CARDS_PER_PAGE, CardFields, RowCard, RowCards, TableFrame } from "@/components/organisms";
import { useTableLayout } from "@/hooks/useMinWidth";
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

// The client's appointments the way the admin lists them: a table on a computer, cards (five a page)
// on a phone. In the table the row (or its service name, a button for keyboards) shows the
// appointment's details; a card has an Open button.
export default function AppointmentsTable({ views, highlightedId, reviewedIds, onOpen, label, selectedId }: AppointmentsTableProps) {
  const asTable = useTableLayout();
  // The phone page belongs to one list: a different list (a new search, tab or filter) starts on page 1
  const listKey = views.map((v) => v.appt.id).join(",");
  const [paged, setPaged] = useState({ listKey, page: 1 });
  const cardPage = paged.listKey === listKey ? paged.page : 1;
  const setCardPage = (page: number) => setPaged({ listKey, page });
  const open = (view: AppointmentView) => (
    <Button
      type="button"
      variant="secondary"
      aria-label={`Open ${view.appt.service_name}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(view);
      }}
      className="px-3! py-2! text-[13px]"
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
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 wrap-break-word font-bold">{view.appt.service_name}</span>
                <Status view={view} reviewedIds={reviewedIds} />
              </div>
              <CardFields fields={[["Artist", view.appt.nailist_name], ["Date", view.dateLabel], ["Time", view.timeLabel]]} />
              <div className="flex justify-end">{open(view)}</div>
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
      minWidthClass="min-w-180"
      head={
        <tr className="text-left text-xs text-gray-red">
          {["Service", "Artist", "Date", "Time", "Status"].map((h) => (
            <th key={h} scope="col" className="pb-2 pr-3 font-medium">{h}</th>
          ))}
        </tr>
      }
    >
      {views.map((view) => {
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
    </TableFrame>
  );
}
