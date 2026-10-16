import { whenLabel } from "@/lib/admin/clientPage";
import type { ClientNote } from "@/services/clientNotesService";
import { Button, initialsOf } from "@/components/atoms";

// A note, with its author's initials, when it was written, and what it's about
export default function NoteItem({ note, about, onDelete }: { note: ClientNote; about?: string; onDelete: () => void }) {
  const author = note.author_name || "Admin";
  return (
    <li className="flex gap-3 rounded-xl border border-crimson-light/50 bg-light-orange/30 p-3">
      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-sm text-berry">
        {initialsOf(author)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-gray-red">
          <span className="text-[13px] font-bold text-gray-red">{author}</span>
          <span>{whenLabel(note.created_at)}</span>
        </p>
        {about && <p className="text-xs font-bold text-berry">{about}</p>}
        <p className="whitespace-pre-wrap text-sm text-gray-red">{note.note}</p>
        <Button type="button" variant="bare" onClick={onDelete} className="self-start text-xs font-bold text-danger-ink underline">
          Delete
        </Button>
      </div>
    </li>
  );
}
