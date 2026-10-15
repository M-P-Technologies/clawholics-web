import { useCallback,useEffect,useRef,useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys, adminQueries } from "../../../lib/tanstack-query/adminQueries";
import type { Auth } from "../../catalog/api/catalogService";
import {
addNote,
deleteNote,
isNotesApiUnavailable,
saveNextSteps,
updateNote,
type ClientNote,
} from "../api/clientNotesService";
import { parseServerTime } from "../../../lib/serverTime";
import Button from "../../../components/ui/Button";
import { SectionSkeleton } from "../../../components/shared/skeletons";

interface Props {
  clientUserId: number;
  tokenFetcher: () => Promise<string | null>;
  clerkId?: string | null;
}

const formatWhen = (value?: string | null) => {
  const time = parseServerTime(value);
  return Number.isNaN(time) ? "" : new Date(time).toLocaleString();
};

const primaryClass =
  "rounded-md bg-crimson px-4 py-1 text-[12px] font-bold text-light-orange disabled:cursor-not-allowed disabled:opacity-40";
const fieldClass =
  "w-full rounded-md border border-crimson-light bg-milk px-4 py-2 text-[13px] text-gray-red outline-none focus:ring-2 focus:ring-crimson";

export default function ClientNotesPanel({ clientUserId, tokenFetcher, clerkId }: Props) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Keep the latest auth inputs in refs, so the queries' session doesn't change with them
  const tokenRef = useRef(tokenFetcher);
  const clerkRef = useRef(clerkId);
  useEffect(() => {
    tokenRef.current = tokenFetcher;
    clerkRef.current = clerkId;
  });
  const getAuth = useCallback(
    async (): Promise<Auth> => ({ token: await tokenRef.current(), clerkId: clerkRef.current }),
    [],
  );

  // The client's notes and next steps: the same cached queries as the client's page
  const session = { getToken: tokenFetcher, clerkId: clerkId ?? undefined };
  const notesQuery = useQuery(adminQueries.clientNotes(clientUserId, session));
  const stepsQuery = useQuery(adminQueries.clientNextSteps(clientUserId, session));
  const notes = notesQuery.data ?? [];
  const savedNextSteps = stepsQuery.data?.text ?? "";
  // The next steps as typed; until then, as saved
  const [typedNextSteps, setNextSteps] = useState<string | null>(null);
  const nextSteps = typedNextSteps ?? savedNextSteps;
  const setNotes = (update: (prev: ClientNote[]) => ClientNote[]) =>
    queryClient.setQueryData<ClientNote[]>(adminKeys.clientNotes(clientUserId), (prev) => update(prev ?? []));
  const loading = notesQuery.isPending || stepsQuery.isPending;
  const loadError = (notesQuery.data ? null : notesQuery.error) ?? (stepsQuery.data ? null : stepsQuery.error);
  const unavailable = !!loadError && isNotesApiUnavailable(loadError);
  const error = actionError ?? (loadError && !unavailable ? loadError.message || "Failed to load notes." : null);

  const run = async (action: (auth: Auth) => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action(await getAuth());
    } catch (err) {
      setError(
        isNotesApiUnavailable(err)
          ? "Notes aren't available yet."
          : err instanceof Error
            ? err.message
            : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSaveNextSteps = () =>
    run(async (auth) => {
      const saved = await saveNextSteps(clientUserId, nextSteps.trim(), auth);
      const text = saved?.text ?? nextSteps.trim();
      setNextSteps(null);
      queryClient.setQueryData(adminKeys.clientNextSteps(clientUserId), (current: object | undefined) => ({ ...current, text }));
    });

  const handleAdd = () => {
    const text = newNote.trim();
    if (!text) return;
    return run(async (auth) => {
      const created = await addNote(clientUserId, text, auth);
      setNotes((prev) => [created, ...prev]);
      setNewNote("");
    });
  };

  const handleSaveEdit = (noteId: number) => {
    const text = editText.trim();
    if (!text) return;
    return run(async (auth) => {
      const updated = await updateNote(clientUserId, noteId, text, auth);
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingId(null);
    });
  };

  const handleDelete = (noteId: number) =>
    run(async (auth) => {
      await deleteNote(clientUserId, noteId, auth);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setDeletingId(null);
    });

  return (
    <section aria-label="Client notes" className="rounded-xl bg-crimson-light/15 px-4 py-4 text-gray-red sm:px-5">
      <p className="mb-2 text-[14px] font-bold uppercase">
        Private notes <span className="text-[11px] font-semibold normal-case">(admin only)</span>
      </p>

      {loading && <SectionSkeleton label="Loading notes" />}

      {!loading && unavailable && <p className="text-[13px]">Notes aren't available yet.</p>}

      {!loading && !unavailable && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={`next-steps-${clientUserId}`} className="text-[12px] font-bold uppercase">
              Next steps
            </label>
            <textarea
              id={`next-steps-${clientUserId}`}
              rows={2}
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              className={fieldClass}
            />
            <Button
              variant="bare"
              type="button"
              onClick={handleSaveNextSteps}
              disabled={busy || nextSteps.trim() === savedNextSteps.trim()}
              className={`${primaryClass} self-start`}
            >
              Save next steps
            </Button>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor={`new-note-${clientUserId}`} className="text-[12px] font-bold uppercase">
              New note
            </label>
            <textarea
              id={`new-note-${clientUserId}`}
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className={fieldClass}
            />
            <Button
              variant="bare"
              type="button"
              onClick={handleAdd}
              disabled={busy || !newNote.trim()}
              className={`${primaryClass} self-start`}
            >
              Add note
            </Button>
          </div>

          {error && (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {error}
            </p>
          )}

          {notes.length === 0 ? (
            <p className="text-[13px] italic">No notes yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-milk px-4 py-2">
                  {editingId === n.id ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        aria-label="Edit note"
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className={fieldClass}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={() => handleSaveEdit(n.id)}
                          disabled={busy || !editText.trim()}
                          
                        >
                          Save note
                        </Button>
                        <Button variant="secondary" type="button" onClick={() => setEditingId(null)} >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words text-[13px]">{n.note}</p>
                      <p className="mt-1 text-[11px] opacity-70">
                        {n.author_name || "Admin"}
                        {formatWhen(n.created_at) ? ` · ${formatWhen(n.created_at)}` : ""}
                      </p>
                      {deletingId === n.id ? (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[12px] font-bold">Delete this note?</span>
                          <Button
                            type="button"
                            onClick={() => handleDelete(n.id)}
                            disabled={busy}
                            
                          >
                            Confirm delete
                          </Button>
                          <Button variant="secondary" type="button" onClick={() => setDeletingId(null)} >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-2 flex gap-2">
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                              setEditingId(n.id);
                              setEditText(n.note);
                              setDeletingId(null);
                            }}
                            
                          >
                            Edit
                          </Button>
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={() => {
                              setDeletingId(n.id);
                              setEditingId(null);
                            }}
                            
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

    </section>
  );
}
