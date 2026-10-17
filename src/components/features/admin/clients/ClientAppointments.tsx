import { timeRangeLabel } from "@/lib/timeFormat";
import { useState } from "react";
import clsx from "clsx";
import { useTableLayout } from "@/hooks/useMinWidth";
import type { VisitDraft } from "@/hooks/admin/useClientPage";
import { dateLabel, statusOf } from "@/lib/admin/clientPage";
import { peso } from "@/lib/dashboardFormat";
import type { ClientAppointment, ClientNote } from "@/services/clientNotesService";
import { Badge, Button } from "@/components/atoms";
import { CARDS_PER_PAGE, CardFields, Dialog, RowCard, RowCards, ImagePreviewDialog } from "@/components/organisms";
import VisitPhotoDialog from "@/components/features/admin/bookings/VisitPhotoDialog";
import VisitNotes from "@/components/features/admin/clients/VisitNotes";
import { ReviewPhoto, ReviewText } from "@/components/features/admin/clients/VisitReview";
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

const COLUMNS = ["Date", "Time", "Service", "Artist", "Status", "Fee", "Review", "Photo", "Notes"];
const linkClass = "whitespace-nowrap text-[13px] font-bold text-berry underline";

// Every appointment of the client, with its review and notes: a table on a computer, cards (five
// to a page) on a phone
export default function ClientAppointments({ appointments, notesFor, draft, busy, onDraft, onSaveNote, onDeleteNote, onApproveReview }: ClientAppointmentsProps) {
  const asTable = useTableLayout();
  const [cardPage, setCardPage] = useState(1);
  const [photo, setPhoto] = useState<string | null>(null);
  // The visit whose notes are open in their window, and the one getting a photo
  const [notesOf, setNotesOf] = useState<ClientAppointment | null>(null);
  const [addingPhoto, setAddingPhoto] = useState<number | null>(null);

  if (appointments.length === 0) return <p className="text-sm text-gray-red">No appointments yet.</p>;

  const fee = (a: ClientAppointment) => (a.price === null ? "–" : peso(a.price));
  const openNotes = (a: ClientAppointment) => {
    setNotesOf(a);
    onDraft({ appointmentId: a.id, text: "" });
  };
  const closeNotes = () => {
    setNotesOf(null);
    onDraft(null);
  };
  // A visit's notes stay behind a link: "Notes (2)", or "Add a note" when there are none
  const notesLink = (a: ClientAppointment) => {
    const count = notesFor(a.id).length;
    return (
      <Button type="button" variant="bare" onClick={() => openNotes(a)} className={linkClass}>
        {count > 0 ? `Notes (${count})` : "Add a note"}
      </Button>
    );
  };
  // The client's review photo; else the visit's own photo; else, for a visit completed with its
  // form, a link to add one
  const photoCell = (a: ClientAppointment) => {
    if (a.review_photo_url) return <ReviewPhoto appointment={a} onOpen={setPhoto} />;
    const visitPhoto = a.completion?.photo_url;
    if (visitPhoto) {
      return (
        <Button type="button" variant="bare" onClick={() => setPhoto(visitPhoto)} aria-label="View visit photo" className="block h-12 w-12 overflow-hidden rounded-md border border-crimson-light/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={visitPhoto} alt="" className="h-full w-full object-cover" />
        </Button>
      );
    }
    if (a.status === "COMPLETED" && a.completion) {
      return (
        <Button type="button" variant="bare" onClick={() => setAddingPhoto(a.id)} className={linkClass}>
          Add photo
        </Button>
      );
    }
    return <span className="text-gray-red">–</span>;
  };
  const windows = (
    <>
      <ImagePreviewDialog imageUrl={photo} title="Photo" onClose={() => setPhoto(null)} />
      {addingPhoto !== null && <VisitPhotoDialog appointmentId={addingPhoto} open onClose={() => setAddingPhoto(null)} />}
      {notesOf && (
        <Dialog open onClose={closeNotes} title={`Notes · ${dateLabel(notesOf.appointment_date)}`} size="lg">
          <div className="flex flex-col gap-3">
            {notesFor(notesOf.id).length === 0 && draft?.appointmentId !== notesOf.id && <p className="text-sm text-gray-red">No notes about this visit yet.</p>}
            <VisitNotes appointment={notesOf} notes={notesFor(notesOf.id)} draft={draft} busy={busy} onDraft={onDraft} onSave={onSaveNote} onDelete={onDeleteNote} />
            {draft?.appointmentId !== notesOf.id && (
              <Button type="button" variant="secondary" size="sm" onClick={() => onDraft({ appointmentId: notesOf.id, text: "" })} className="self-start">
                Add a note
              </Button>
            )}
          </div>
        </Dialog>
      )}
    </>
  );

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
                  <span className="block text-xs text-gray-red">{timeRangeLabel(a.appointment_time)}</span>
                </span>
                <Badge tone={statusOf(a.status).tone}>{statusOf(a.status).label}</Badge>
              </div>
              <CardFields
                fields={[
                  ["Service", a.service_name],
                  ["Artist", a.nailist_name],
                  ["Fee", fee(a)],
                  ["Review", <ReviewText key="review" appointment={a} busy={busy} onApprove={onApproveReview} />],
                  ["Photo", <span key="photo">{photoCell(a)}</span>],
                  ["Notes", <span key="notes">{notesLink(a)}</span>],
                ]}
              />
            </RowCard>
          ))}
        </RowCards>
        <Pagination page={cards.current} totalPages={cards.pages} onPageChange={setCardPage} summary={cards} />
        {windows}
      </>
    );
  }

  const cell = "border-t border-dotted border-crimson-light py-3 pr-3 align-top";
  return (
    <div className="overflow-x-auto">
      <table aria-label="Appointments" className="w-full min-w-220 border-separate border-spacing-0 text-sm text-gray-red">
        <thead>
          <tr className="text-left text-xs text-gray-red">
            {COLUMNS.map((h) => (
              <th key={h} scope="col" className={clsx("pb-2 pr-3 font-medium", h === "Fee" && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {appointments.map((a) => (
              <tr key={a.id}>
                <th scope="row" className={clsx(cell, "text-left font-bold")}>
                  {dateLabel(a.appointment_date)}
                </th>
                <td className={cell}>{timeRangeLabel(a.appointment_time)}</td>
                <td className={cell}>{a.service_name}</td>
                <td className={cell}>{a.nailist_name}</td>
                <td className={cell}>
                  <Badge tone={statusOf(a.status).tone}>{statusOf(a.status).label}</Badge>
                </td>
                <td className={clsx(cell, "text-right")}>{fee(a)}</td>
                <td className={clsx(cell, "max-w-65")}>
                  <ReviewText appointment={a} busy={busy} onApprove={onApproveReview} />
                </td>
                <td className={cell}>{photoCell(a)}</td>
                <td className="border-t border-dotted border-crimson-light py-3 align-top">{notesLink(a)}</td>
              </tr>
          ))}
        </tbody>
      </table>
      {windows}
    </div>
  );
}
