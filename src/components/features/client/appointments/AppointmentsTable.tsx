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
// on a phone. Open shows the appointment's details.
export default function AppointmentsTable({ views, highlightedId, reviewedIds, onOpen, label }: AppointmentsTableProps) {
  const asTable = useTableLayout();
  const [cardPage, setCardPage] = useState(1);
  const open = (view: AppointmentView) => (
    <Button type="button" variant="secondary" aria-label={`Open ${view.appt.service_name}`} onClick={() => onOpen(view)} className="!px-4 !py-2 text-[13px]">
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
                <span className="min-w-0 break-words font-bold">{view.appt.service_name}</span>
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
      minWidthClass="min-w-[720px]"
      head={
        <tr className="text-left text-[12px] text-gray-red/70">
          {["Service", "Artist", "Date", "Time", "Status"].map((h) => (
            <th key={h} scope="col" className="pb-2 pr-3 font-medium">{h}</th>
          ))}
          <th scope="col" className="pb-2 font-medium"><span className="sr-only">Open</span></th>
        </tr>
      }
    >
      {views.map((view) => {
        const highlighted = view.appt.id === highlightedId;
        return (
          <tr key={view.appt.id} data-highlighted={highlighted || undefined} className={clsx(highlighted && "bg-crimson-light/20")}>
            <th scope="row" className={clsx(cell, "text-left font-bold")}>{view.appt.service_name}</th>
            <td className={cell}>{view.appt.nailist_name}</td>
            <td className={cell}>{view.dateLabel}</td>
            <td className={cell}>{view.timeLabel}</td>
            <td className={cell}><Status view={view} reviewedIds={reviewedIds} /></td>
            <td className={clsx(cell, "pr-0 text-right")}>{open(view)}</td>
          </tr>
        );
      })}
    </TableFrame>
  );
}
