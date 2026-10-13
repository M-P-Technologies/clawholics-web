import { dateLabel, noteFieldClass } from "../../../lib/admin/clientPage";
import type { ClientAppointment, ClientNote } from "../../../services/clientNotesService";
import type { VisitDraft } from "../../../hooks/admin/useClientPage";
import Button from "../../ui/Button";
import NoteItem from "./NoteItem";

interface VisitNotesProps {
  appointment: ClientAppointment;
  notes: ClientNote[];
  draft: VisitDraft | null;
  busy: boolean;
  onDraft: (draft: VisitDraft | null) => void;
  onSave: () => void;
  onDelete: (noteId: number) => void;
}

// An appointment's notes, and the box for a new one while it's being written. Nothing when
// there are neither.
export default function VisitNotes({ appointment, notes, draft, busy, onDraft, onSave, onDelete }: VisitNotesProps) {
  const writing = draft?.appointmentId === appointment.id;
  if (notes.length === 0 && !writing) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-crimson-light/50 bg-light-orange/40 p-3">
      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <NoteItem key={n.id} note={n} onDelete={() => onDelete(n.id)} />
          ))}
        </ul>
      )}
      {writing && (
        <div className="flex flex-col gap-2">
          <textarea
            aria-label={`Note about ${dateLabel(appointment.appointment_date)}`}
            rows={2}
            value={draft.text}
            onChange={(e) => onDraft({ appointmentId: appointment.id, text: e.target.value })}
            placeholder="What happened at this appointment?"
            className={noteFieldClass}
          />
          <div className="flex gap-2">
            <Button type="button" loading={busy} disabled={!draft.text.trim()} onClick={onSave}>
              Save note
            </Button>
            <Button type="button" variant="secondary" onClick={() => onDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
