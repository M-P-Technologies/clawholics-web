"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/molecules";
import { adminDataChanged, adminKeys, adminQueries } from "../../lib/adminQueries";
import { CLIENT_TABS, clientName, clientPanelRows, dateLabel, manilaToday, nextVisitHighlight, stampsLabel, visitNoteLabel, type ClientTab } from "../../lib/admin/clientPage";
import { useParams } from "../../lib/router";
import { itemName, upperFirst } from "../../lib/itemName";
import { useStampTarget } from "../useStampTarget";
import { addNote, deleteNote, saveNextSteps, type ClientDetails, type ClientNote } from "../../services/clientNotesService";
import { setReviewApproval } from "../../services/reviewService";
import { cancelAndRefundAppointment, updateAppointmentStatus, type AppointmentStatus } from "../../services/appointmentService";

/** The note being written about one appointment */
export interface VisitDraft {
  appointmentId: number;
  text: string;
}

// The admin client page's data and actions: the client, their notes and next steps, the open
// tab, and the drafts of new notes.
export function useClientPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const toast = useToast();
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const stampTarget = useStampTarget();
  const session = { getToken, clerkId: user?.id };
  // The client, their notes and next steps, cached per client: coming back to the page shows them
  // at once. Without the notes or next steps the page still works.
  const clientQuery = useQuery({
    ...adminQueries.client(clientId, session),
    enabled: isLoaded,
    // A client who isn't there won't be there on a second try either
    retry: (failures, error) => (error as { status?: number }).status !== 404 && failures < 1,
  });
  const notesQuery = useQuery({ ...adminQueries.clientNotes(clientId, session), enabled: isLoaded });
  const stepsQuery = useQuery({ ...adminQueries.clientNextSteps(clientId, session), enabled: isLoaded });
  const artistsQuery = useQuery(adminQueries.nailists());
  // The client's Clerk photo, by Clerk id; without it the panel shows initials
  const profilesQuery = useQuery({ ...adminQueries.directoryProfiles(session), enabled: isLoaded });
  const details: ClientDetails | null = clientQuery.data ?? null;
  const notFound = !details && (clientQuery.error as { status?: number } | null)?.status === 404;
  // A failed refresh keeps the page already loaded
  const failed = !details && clientQuery.isError && !notFound;
  const notes: ClientNote[] = notesQuery.data ?? [];
  // The next steps as typed; until then, as saved
  const [typedSteps, setSteps] = useState<string | null>(null);
  const steps = typedSteps ?? stepsQuery.data?.text ?? "";
  const [draft, setDraft] = useState("");
  const [visitDraft, setVisitDraft] = useState<VisitDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<ClientTab>("overview");
  // Today in Manila, for the booking to track
  const [today] = useState(manilaToday);

  const auth = useCallback(async () => ({ token: await getToken(), clerkId: user?.id }), [getToken, user?.id]);

  const loadNotes = () => queryClient.invalidateQueries({ queryKey: adminKeys.clientNotes(clientId) });

  // Who the messages are about: this client's name, or "this client" until they have loaded
  const who = () => itemName(details ? clientName(details.client) : "", "this client");
  /** "Gel Manicure on Oct 29" for one of this client's visits, for a message about it */
  const visitOf = (appointmentId: number) => {
    const a = details?.appointments.find((x) => x.id === appointmentId);
    return a ? `${a.service_name} visit on ${dateLabel(a.appointment_date)}` : "visit";
  };

  // `message` may be a function, for words that depend on what the work answered
  const run = async (work: () => Promise<unknown>, done: string, message?: string | (() => string)) => {
    try {
      setBusy(true);
      await work();
      toast.show("success", done, typeof message === "function" ? message() : message);
      return true;
    } catch (error) {
      toast.show("error", `Not saved for ${who()}`, error instanceof Error ? error.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addGeneralNote = async () => {
    if (await run(async () => addNote(clientId, draft.trim(), await auth()), "Note added", `It is on ${who()}'s page now.`)) {
      setDraft("");
      await loadNotes();
    }
  };
  const addVisitNote = async () => {
    if (!visitDraft) return;
    if (await run(async () => addNote(clientId, visitDraft.text.trim(), await auth(), visitDraft.appointmentId), "Note added", `It is on ${who()}'s ${visitOf(visitDraft.appointmentId)}.`)) {
      setVisitDraft(null);
      await loadNotes();
    }
  };
  const removeNote = async (noteId: number) => {
    if (await run(async () => deleteNote(clientId, noteId, await auth()), "Note deleted", `It was removed from ${who()}'s page.`)) await loadNotes();
  };
  /** Shows a visit's review on the home page, or takes it off */
  const approveReview = async (reviewId: number, approved: boolean) => {
    const done = await run(async () => setReviewApproval(reviewId, approved, await auth()), approved ? "Review approved for the home page" : "Review taken off the home page", `${upperFirst(who())}'s review.`);
    if (!done) return;
    queryClient.setQueryData<ClientDetails>(adminKeys.client(clientId), (current) =>
      current && { ...current, appointments: current.appointments.map((a) => (a.review_id === reviewId ? { ...a, review_approved: approved ? 1 : 0 } : a)) },
    );
  };
  // A status change from the tracker, then everything that shows it loads again
  const changeStatus = async (appointmentId: number, status: AppointmentStatus, done: string, message?: string) => {
    if (await run(async () => updateAppointmentStatus(appointmentId, status, await getToken(), user?.id), done, message)) {
      await adminDataChanged(queryClient);
    }
  };
  /** The client didn't come (the downpayment is kept) */
  const markNoShow = (appointmentId: number) => changeStatus(appointmentId, "NO_SHOW", `${upperFirst(who())} marked as a no-show`, `${upperFirst(visitOf(appointmentId))}. The downpayment is kept.`);
  /** Cancelled for coming 25+ minutes late (the downpayment is kept) */
  const cancelLate = (appointmentId: number) => changeStatus(appointmentId, "CANCELLED", `${upperFirst(who())}'s visit cancelled for coming late`, `${upperFirst(visitOf(appointmentId))}. The downpayment is kept.`);
  /** Cancelled by an admin: the client is emailed and the downpayment refunded by the terms (72+ hours ahead) */
  const cancelBooking = async (appointmentId: number) => {
    let refunded = false;
    const done = await run(
      async () => {
        refunded = (await cancelAndRefundAppointment(appointmentId, await getToken(), user?.id)).status === "REFUNDED";
      },
      "Appointment cancelled",
      () => `${upperFirst(visitOf(appointmentId))}. ${refunded ? "The downpayment is refunded." : "The downpayment is kept, or there was none to refund."}`,
    );
    if (done) await adminDataChanged(queryClient);
  };
  const saveSteps = () =>
    run(async () => {
      await saveNextSteps(clientId, steps, await auth());
      queryClient.setQueryData(adminKeys.clientNextSteps(clientId), (current: object | undefined) => ({ ...current, text: steps }));
    }, "Next steps saved", `For ${who()}.`);

  const appointments = details?.appointments ?? [];
  const nextAppointment = details?.summary.nextVisit
    ? appointments.find((a) => a.status === "CONFIRMED" && a.appointment_date === details.summary.nextVisit)
    : undefined;
  return {
    details,
    /** The stamps a loyalty card needs for a reward */
    stampTarget,
    /** "4 / 10": the stamps on the card, capped at the target */
    stampsValue: `${Math.min(details?.summary.stamps ?? 0, stampTarget)} / ${stampTarget}`,
    notFound,
    failed,
    today,
    tab,
    setTab,
    busy,
    notes,
    /** The tabs, with the number of notes and appointments */
    tabs: CLIENT_TABS.map((t) => ({
      value: t.value,
      label: t.label,
      count: t.value === "notes" ? (notes.length > 0 ? notes.length : undefined) : t.value === "appointments" ? appointments.length : undefined,
    })),
    /** The profile panel: the name, the stamps badge, the next visit and the Client info rows */
    name: details ? clientName(details.client) : "",
    imageUrl: (details && profilesQuery.data?.[details.client.clerk_id]?.imageUrl) || undefined,
    stampsLabel: stampsLabel(details?.summary.stamps ?? 0),
    /** The artists, for the Complete visit form's "Done by" */
    artists: (artistsQuery.data ?? []).map((n) => ({ id: n.id, name: n.name })),
    markNoShow,
    cancelLate,
    cancelBooking,
    highlight: nextVisitHighlight(nextAppointment),
    panelRows: details ? clientPanelRows(details) : [],
    /** Notes about the client in general, and those about one visit with what they're about */
    generalNotes: notes.filter((n) => !n.appointment_id),
    visitNotes: notes
      .filter((n) => n.appointment_id)
      .map((note) => ({ note, about: visitNoteLabel(appointments.find((a) => a.id === note.appointment_id)) })),
    notesFor: (appointmentId: number) => notes.filter((n) => n.appointment_id === appointmentId),
    draft,
    setDraft,
    addGeneralNote,
    visitDraft,
    setVisitDraft,
    addVisitNote,
    removeNote,
    approveReview,
    steps,
    setSteps,
    saveSteps,
  };
}
