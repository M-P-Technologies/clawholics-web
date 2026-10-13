"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { ArrowLeft, CalendarCheck, CalendarClock, Stamp, Wallet, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import AdminShell from "../components/admin/AdminShell";
import KpiCard from "../components/admin/dashboard/KpiCard";
import Button from "../components/ui/Button";
import StatePanel from "../components/ui/StatePanel";
import { useToast } from "../components/ui/ToastProvider";
import { peso } from "../lib/dashboardFormat";
import { Link, useParams } from "../lib/router";
import {
  addNote,
  deleteNote,
  fetchClient,
  fetchNextSteps,
  fetchNotes,
  saveNextSteps,
  type ClientDetails,
  type ClientNote,
} from "../services/clientNotesService";
import { parseServerTime } from "../services/serverTime";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (ymd: string | null) => {
  if (!ymd) return "–";
  const [y, m, d] = ymd.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};
const whenLabel = (value: string | null | undefined) => {
  const time = parseServerTime(value);
  return Number.isNaN(time) ? "" : new Date(time).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
};

const STATUS: Record<string, { label: string; className: string }> = {
  COMPLETED: { label: "Completed", className: "bg-success/20 text-gray-red" },
  CONFIRMED: { label: "Confirmed", className: "bg-crimson-light/50 text-berry" },
  PENDING: { label: "Pending", className: "bg-sand text-gray-red" },
  AWAITING_PROOF: { label: "Awaiting proof", className: "bg-sand text-gray-red" },
  CANCELLED: { label: "Cancelled", className: "bg-danger/15 text-gray-red" },
  CANCELED: { label: "Cancelled", className: "bg-danger/15 text-gray-red" },
  REFUNDED: { label: "Refunded", className: "bg-danger/15 text-gray-red" },
};
const statusOf = (status: string) => STATUS[status] ?? { label: status, className: "bg-sand text-gray-red" };

const fieldClass =
  "w-full rounded-md border border-crimson-light bg-milk px-3 py-2 text-sm text-gray-red outline-none focus:ring-2 focus:ring-crimson";

function Card({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={clsx("flex min-w-0 flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal", className)}>
      <h2 className="font-display text-xl font-normal text-gray-red">{title}</h2>
      {children}
    </section>
  );
}

function NoteItem({ note, onDelete }: { note: ClientNote; onDelete: () => void }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl bg-crimson-light/20 px-3 py-2">
      <p className="whitespace-pre-wrap text-sm text-gray-red">{note.note}</p>
      <p className="flex flex-wrap items-center gap-x-3 text-[12px] text-gray-red/70">
        <span>{[note.author_name, whenLabel(note.created_at)].filter(Boolean).join(", ")}</span>
        <Button type="button" variant="bare" onClick={onDelete} className="text-[12px] font-bold text-danger underline">
          Delete
        </Button>
      </p>
    </li>
  );
}

// One client's page (admin only): who they are, how they've visited, every appointment with
// the notes the admins wrote about it, general notes, and the next steps.
export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const toast = useToast();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [details, setDetails] = useState<ClientDetails | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [steps, setSteps] = useState("");
  const [draft, setDraft] = useState("");
  const [visitDraft, setVisitDraft] = useState<{ appointmentId: number; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const auth = useCallback(async () => ({ token: await getToken(), clerkId: user?.id }), [getToken, user?.id]);

  const loadNotes = useCallback(async () => {
    try {
      setNotes(await fetchNotes(clientId, await auth()));
    } catch {
      setNotes([]);
    }
  }, [clientId, auth]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const a = await auth();
        const [loaded, loadedNotes, loadedSteps] = await Promise.all([
          fetchClient(clientId, a),
          fetchNotes(clientId, a).catch(() => []),
          fetchNextSteps(clientId, a).catch(() => null),
        ]);
        if (!live) return;
        setDetails(loaded);
        setNotes(loadedNotes);
        setSteps(loadedSteps?.text ?? "");
      } catch (error) {
        if (!live) return;
        if ((error as { status?: number }).status === 404) setNotFound(true);
        else setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [clientId, auth]);

  const run = async (work: () => Promise<unknown>, done: string) => {
    try {
      setBusy(true);
      await work();
      toast.show("success", done);
      return true;
    } catch (error) {
      toast.show("error", "Not saved", error instanceof Error ? error.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addGeneral = async () => {
    if (await run(async () => addNote(clientId, draft.trim(), await auth()), "Note added")) {
      setDraft("");
      await loadNotes();
    }
  };
  const addForVisit = async () => {
    if (!visitDraft) return;
    if (await run(async () => addNote(clientId, visitDraft.text.trim(), await auth(), visitDraft.appointmentId), "Note added")) {
      setVisitDraft(null);
      await loadNotes();
    }
  };
  const remove = async (noteId: number) => {
    if (await run(async () => deleteNote(clientId, noteId, await auth()), "Note deleted")) await loadNotes();
  };
  const saveSteps = () => run(async () => saveNextSteps(clientId, steps, await auth()), "Next steps saved");

  const back = (
    <Link to="/client-directory" className="flex items-center gap-1.5 text-sm font-bold text-berry underline decoration-crimson-light underline-offset-4">
      <ArrowLeft size={16} aria-hidden="true" />
      Back to clients
    </Link>
  );

  if (notFound || failed) {
    return (
      <AdminShell title="Client">
        <StatePanel
          kind="error"
          title={notFound ? "We couldn't find this client" : "We couldn't load this client"}
          message={notFound ? "They may have been removed, or this is a walk-in booked without an account." : "Please check your connection and try again."}
        >
          {back}
        </StatePanel>
      </AdminShell>
    );
  }

  if (!details) {
    return (
      <AdminShell title="Client">
        <p className="text-sm text-gray-red/70">Loading…</p>
      </AdminShell>
    );
  }

  const { client, summary, appointments } = details;
  const name = `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || client.email;
  const contact: [string, string | null][] = [
    ["Email", client.email],
    ["Phone", client.phone],
    ["Other phone", client.alt_phone],
    ["Instagram", client.instagram_handle],
    ["Facebook", client.facebook_handle],
    ["Prefers", client.preferred_contact_method],
    ["Client since", client.created_at ? dateLabel(client.created_at.slice(0, 10)) : null],
  ];
  const general = notes.filter((n) => !n.appointment_id);
  const notesFor = (appointmentId: number) => notes.filter((n) => n.appointment_id === appointmentId);

  return (
    <AdminShell title="Client" actions={back}>
      <div className="flex flex-col gap-4 overflow-y-auto pb-2 md:gap-6">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-4">
          <section aria-label="Contact" className="flex min-w-0 flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal lg:row-span-2">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-2xl text-berry">
                {name.charAt(0).toUpperCase()}
              </span>
              <h2 className="min-w-0 break-words font-display text-2xl font-normal leading-tight text-gray-red">{name}</h2>
            </div>
            <dl className="flex flex-col gap-2 text-sm">
              {contact
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className="flex flex-col">
                    <dt className="text-[12px] text-gray-red/70">{label}</dt>
                    <dd className="break-words text-gray-red">{value}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {/* Three counts across, then the two dates, wider so a whole date fits */}
          <section aria-label="Summary" className="grid grid-cols-2 gap-4 sm:grid-cols-6 md:gap-6 lg:col-span-3">
            <KpiCard icon={CalendarCheck} label="Visits" value={String(summary.visits)} hint="completed" className="sm:col-span-2" />
            <KpiCard icon={Wallet} label="Total spent" value={peso(summary.totalSpent)} hint="list price of visits" className="sm:col-span-2" />
            <KpiCard icon={Stamp} label="Loyalty stamps" value={String(summary.stamps)} className="col-span-2 sm:col-span-2" />
            <KpiCard icon={Sparkles} label="Last visit" value={dateLabel(summary.lastVisit)} className="sm:col-span-3" />
            <KpiCard icon={CalendarClock} label="Next visit" value={dateLabel(summary.nextVisit)} className="sm:col-span-3" />
          </section>

          <div className="grid grid-cols-1 gap-4 md:gap-6 lg:col-span-3 xl:grid-cols-2">
            <Card title="Notes">
              <label className="flex flex-col gap-1 text-sm text-gray-red">
                <span className="sr-only">New note</span>
                <textarea
                  aria-label="New note"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Allergies, preferences, anything to remember…"
                  className={fieldClass}
                />
              </label>
              <Button type="button" loading={busy} disabled={!draft.trim()} onClick={addGeneral} className="self-start">
                Add note
              </Button>
              {general.length === 0 ? (
                <p className="text-sm text-gray-red/70">No notes yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {general.map((n) => (
                    <NoteItem key={n.id} note={n} onDelete={() => remove(n.id)} />
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Next steps">
              <textarea
                aria-label="Next steps"
                rows={5}
                value={steps}
                onChange={(e) => setSteps(e.target.value)}
                placeholder="What to do next for this client"
                className={fieldClass}
              />
              <Button type="button" variant="secondary" loading={busy} onClick={saveSteps} className="self-start">
                Save
              </Button>
            </Card>
          </div>
        </div>

        <Card title="Appointments">
          {appointments.length === 0 ? (
            <p className="text-sm text-gray-red/70">No appointments yet.</p>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm text-gray-red">
                <thead>
                  <tr className="text-left text-[12px] text-gray-red/70">
                    {["Date", "Time", "Service", "Artist", "Status", "Fee", "Notes"].map((h) => (
                      <th key={h} scope="col" className={clsx("pb-2 pr-3 font-medium", h === "Fee" && "text-right")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => {
                    const visitNotes = notesFor(a.id);
                    const status = statusOf(a.status);
                    const writing = visitDraft?.appointmentId === a.id;
                    return [
                      <tr key={a.id}>
                        <th scope="row" className="border-t border-dotted border-crimson-light py-3 pr-3 text-left font-bold">
                          {dateLabel(a.appointment_date)}
                        </th>
                        <td className="border-t border-dotted border-crimson-light py-3 pr-3">{a.appointment_time}</td>
                        <td className="border-t border-dotted border-crimson-light py-3 pr-3">{a.service_name}</td>
                        <td className="border-t border-dotted border-crimson-light py-3 pr-3">{a.nailist_name}</td>
                        <td className="border-t border-dotted border-crimson-light py-3 pr-3">
                          <span className={clsx("rounded-full px-2.5 py-0.5 text-[12px] font-bold", status.className)}>{status.label}</span>
                        </td>
                        <td className="border-t border-dotted border-crimson-light py-3 pr-3 text-right">{a.price === null ? "–" : peso(a.price)}</td>
                        <td className="border-t border-dotted border-crimson-light py-3">
                          <Button
                            type="button"
                            variant="bare"
                            onClick={() => setVisitDraft(writing ? null : { appointmentId: a.id, text: "" })}
                            className="text-[13px] font-bold text-berry underline"
                          >
                            Add a note
                          </Button>
                        </td>
                      </tr>,
                      (visitNotes.length > 0 || writing) && (
                        <tr key={`${a.id}-notes`}>
                          <td colSpan={7} className="pb-3">
                            <div className="flex flex-col gap-2 rounded-xl border border-crimson-light/50 bg-light-orange/40 p-3">
                              {visitNotes.length > 0 && (
                                <ul className="flex flex-col gap-2">
                                  {visitNotes.map((n) => (
                                    <NoteItem key={n.id} note={n} onDelete={() => remove(n.id)} />
                                  ))}
                                </ul>
                              )}
                              {writing && (
                                <div className="flex flex-col gap-2">
                                  <textarea
                                    aria-label={`Note about ${dateLabel(a.appointment_date)}`}
                                    rows={2}
                                    value={visitDraft.text}
                                    onChange={(e) => setVisitDraft({ appointmentId: a.id, text: e.target.value })}
                                    placeholder="What happened at this appointment?"
                                    className={fieldClass}
                                  />
                                  <div className="flex gap-2">
                                    <Button type="button" loading={busy} disabled={!visitDraft.text.trim()} onClick={addForVisit}>
                                      Save note
                                    </Button>
                                    <Button type="button" variant="secondary" onClick={() => setVisitDraft(null)}>
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminShell>
  );
}
