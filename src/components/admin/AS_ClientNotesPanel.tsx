import { useCallback,useEffect,useRef,useState } from "react";
import type { Auth } from "../../services/catalogService";
import {
addNote,
deleteNote,
fetchNextSteps,
fetchNotes,
isNotesApiUnavailable,
saveNextSteps,
updateNote,
type ClientNote,
} from "../../services/clientNotesService";
import { parseServerTime } from "../../services/serverTime";
import Button from "../ui/Button";

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
  "w-full rounded-sm border border-crimson/40 bg-light-orange px-4 py-2 text-[13px] text-gray-red outline-none focus:ring-2 focus:ring-crimson";

export default function AS_ClientNotesPanel({ clientUserId, tokenFetcher, clerkId }: Props) {
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [nextSteps, setNextSteps] = useState("");
  const [savedNextSteps, setSavedNextSteps] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Keep the latest auth inputs in refs so the load effect only reruns for a different client.
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = await getAuth();
        const [loadedNotes, steps] = await Promise.all([
          fetchNotes(clientUserId, auth),
          fetchNextSteps(clientUserId, auth),
        ]);
        if (cancelled) return;
        setNotes(loadedNotes);
        setNextSteps(steps.text ?? "");
        setSavedNextSteps(steps.text ?? "");
        setUnavailable(false);
      } catch (err) {
        if (cancelled) return;
        if (isNotesApiUnavailable(err)) setUnavailable(true);
        else setError(err instanceof Error ? err.message : "Failed to load notes.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientUserId, getAuth]);

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
      setNextSteps(text);
      setSavedNextSteps(text);
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
    <section aria-label="Client notes" className="rounded-sm bg-light-orange px-4 py-4 text-gray-red sm:px-4 border border-crimson-light/80">
      <p className="mb-2 text-[14px] font-bold uppercase">
        Private notes <span className="text-[11px] font-semibold normal-case">(admin only)</span>
      </p>

      {loading && <p className="text-[13px]">Loading notes...</p>}

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
                <li key={n.id} className="rounded-sm bg-light-orange px-4 py-2">
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
