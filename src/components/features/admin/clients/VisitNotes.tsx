import { dateLabel, noteFieldClass } from "@/lib/admin/clientPage";
import type { ClientAppointment, ClientNote } from "@/services/clientNotesService";
import type { VisitDraft } from "@/hooks/admin/useClientPage";
import NoteItem from "@/components/features/admin/clients/NoteItem";

interface VisitNotesProps {
  appointment: ClientAppointment;
  notes: ClientNote[];
  draft: VisitDraft | null;
  busy: boolean;
  onDraft: (draft: VisitDraft | null) => void;
  onDelete: (noteId: number) => void;
}

// An appointment's notes, and the text area for a new one while it's being written (the dialog
// around it has the Save note and Cancel buttons). Nothing when there are neither.
export default function VisitNotes({ appointment, notes, draft, busy, onDraft, onDelete }: VisitNotesProps) {
  const writing = draft?.appointmentId === appointment.id;
  if (notes.length === 0 && !writing) return null;
  return (
    <>
      {notes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} onDelete={() => onDelete(n.id)} />
          ))}
        </ul>
      )}
      {writing && (
        <textarea
          aria-label={`Note about ${dateLabel(appointment.appointment_date)}`}
          rows={3}
          value={draft.text}
          disabled={busy}
          onChange={(e) => onDraft({ appointmentId: appointment.id, text: e.target.value })}
          placeholder="What happened at this appointment?"
          className={noteFieldClass}
        />
      )}
    </>
  );
}
