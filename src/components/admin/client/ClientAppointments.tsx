import { useState } from "react";
import clsx from "clsx";
import { useTableLayout } from "../../../hooks/useMinWidth";
import type { VisitDraft } from "../../../hooks/admin/useClientPage";
import { dateLabel, statusOf } from "../../../lib/admin/clientPage";
import { peso } from "../../../lib/dashboardFormat";
import type { ClientAppointment, ClientNote } from "../../../services/clientNotesService";
import { Badge, Button } from "@/components/atoms";
import ImagePreviewModal from "../ImagePreviewModal";
import { CARDS_PER_PAGE, CardFields, RowCard, RowCards } from "@/components/organisms";
import VisitNotes from "./VisitNotes";
import { ReviewPhoto, ReviewText } from "./VisitReview";
import { Pagination, paginate } from "@/components/molecules";

interface ClientAppointmentsProps {
  appointments: ClientAppointment[];
  notesFor: (appointmentId: number) => ClientNote[];
  draft: VisitDraft | null;
  busy: boolean;
  onDraft: (draft: VisitDraft | null) => void;
  onSaveNote: () => void;
  onDeleteNote: (noteId: number) => void;
  /** Shows a review on the home page, or takes it off */
  onApproveReview: (reviewId: number, approved: boolean) => void;
}

const COLUMNS = ["Date", "Time", "Service", "Artist", "Status", "Fee", "Review", "Review photo", "Notes"];

// Every appointment of the client, with its review and notes: a table on a computer, cards (five
// to a page) on a phone
export default function ClientAppointments({ appointments, notesFor, draft, busy, onDraft, onSaveNote, onDeleteNote, onApproveReview }: ClientAppointmentsProps) {
  const asTable = useTableLayout();
  const [cardPage, setCardPage] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);

  if (appointments.length === 0) return <p className="text-sm text-gray-red/70">No appointments yet.</p>;

  const notesOf = (a: ClientAppointment) => (
    <VisitNotes appointment={a} notes={notesFor(a.id)} draft={draft} busy={busy} onDraft={onDraft} onSave={onSaveNote} onDelete={onDeleteNote} />
  );
  const fee = (a: ClientAppointment) => (a.price === null ? "–" : peso(a.price));
  const preview = <ImagePreviewModal imageUrl={photo} title="Review photo" onClose={() => setPhoto(null)} />;

  if (!asTable) {
    const cards = paginate(appointments, cardPage, CARDS_PER_PAGE);
    return (
      <>
        <RowCards label="Appointments">
          {cards.rows.map((a) => (
            <RowCard key={a.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-bold">{dateLabel(a.appointment_date)}</span>
                  <span className="block text-[12px] text-gray-red/70">{a.appointment_time}</span>
                </span>
                <Badge tone={statusOf(a.status).tone}>{statusOf(a.status).label}</Badge>
              </div>
              <CardFields
                fields={[
                  ["Service", a.service_name],
                  ["Artist", a.nailist_name],
                  ["Fee", fee(a)],
                  ["Review", <ReviewText key="review" appointment={a} busy={busy} onApprove={onApproveReview} />],
                  ["Review photo", <ReviewPhoto key="photo" appointment={a} onOpen={setPhoto} />],
                ]}
              />
              {notesOf(a)}
              {draft?.appointmentId !== a.id && (
                <Button type="button" variant="bare" onClick={() => onDraft({ appointmentId: a.id, text: "" })} className="self-start text-[13px] font-bold text-berry underline">
                  Add a note
                </Button>
              )}
            </RowCard>
          ))}
        </RowCards>
        <Pagination page={cards.current} totalPages={cards.pages} onPageChange={setCardPage} summary={cards} />
        {preview}
      </>
    );
  }

  const cell = "border-t border-dotted border-crimson-light py-3 pr-3 align-top";
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table aria-label="Appointments" className="w-full min-w-[880px] border-separate border-spacing-0 text-sm text-gray-red">
        <thead>
          <tr className="text-left text-[12px] text-gray-red/70">
            {COLUMNS.map((h) => (
              <th key={h} scope="col" className={clsx("pb-2 pr-3 font-medium", h === "Fee" && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => {
            const writing = draft?.appointmentId === a.id;
            return [
              <tr key={a.id}>
                <th scope="row" className={clsx(cell, "text-left font-bold")}>
                  {dateLabel(a.appointment_date)}
                </th>
                <td className={cell}>{a.appointment_time}</td>
                <td className={cell}>{a.service_name}</td>
                <td className={cell}>{a.nailist_name}</td>
                <td className={cell}>
                  <Badge tone={statusOf(a.status).tone}>{statusOf(a.status).label}</Badge>
                </td>
                <td className={clsx(cell, "text-right")}>{fee(a)}</td>
                <td className={clsx(cell, "max-w-[260px]")}>
                  <ReviewText appointment={a} busy={busy} onApprove={onApproveReview} />
                </td>
                <td className={cell}>
                  <ReviewPhoto appointment={a} onOpen={setPhoto} />
                </td>
                <td className="border-t border-dotted border-crimson-light py-3 align-top">
                  <Button type="button" variant="bare" onClick={() => onDraft(writing ? null : { appointmentId: a.id, text: "" })} className="whitespace-nowrap text-[13px] font-bold text-berry underline">
                    Add a note
                  </Button>
                </td>
              </tr>,
              (writing || notesFor(a.id).length > 0) && (
                <tr key={`${a.id}-notes`}>
                  <td colSpan={COLUMNS.length} className="pb-3">
                    {notesOf(a)}
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
      {preview}
    </div>
  );
}
