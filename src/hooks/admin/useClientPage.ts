"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminKeys, adminQueries } from "../../lib/adminQueries";
import { useToast } from "../../components/ui/ToastProvider";
import { manilaToday, type ClientTab } from "../../lib/admin/clientPage";
import { useParams } from "../../lib/router";
import { useStampTarget } from "../useStampTarget";
import { addNote, deleteNote, saveNextSteps, type ClientDetails, type ClientNote } from "../../services/clientNotesService";
import { setReviewApproval } from "../../services/reviewService";

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

  const addGeneralNote = async () => {
    if (await run(async () => addNote(clientId, draft.trim(), await auth()), "Note added")) {
      setDraft("");
      await loadNotes();
    }
  };
  const addVisitNote = async () => {
    if (!visitDraft) return;
    if (await run(async () => addNote(clientId, visitDraft.text.trim(), await auth(), visitDraft.appointmentId), "Note added")) {
      setVisitDraft(null);
      await loadNotes();
    }
  };
  const removeNote = async (noteId: number) => {
    if (await run(async () => deleteNote(clientId, noteId, await auth()), "Note deleted")) await loadNotes();
  };
  /** Shows a visit's review on the home page, or takes it off */
  const approveReview = async (reviewId: number, approved: boolean) => {
    const done = await run(async () => setReviewApproval(reviewId, approved, await auth()), approved ? "Review approved for the home page" : "Review taken off the home page");
    if (!done) return;
    queryClient.setQueryData<ClientDetails>(adminKeys.client(clientId), (current) =>
      current && { ...current, appointments: current.appointments.map((a) => (a.review_id === reviewId ? { ...a, review_approved: approved ? 1 : 0 } : a)) },
    );
  };
  const saveSteps = () =>
    run(async () => {
      await saveNextSteps(clientId, steps, await auth());
      queryClient.setQueryData(adminKeys.clientNextSteps(clientId), (current: object | undefined) => ({ ...current, text: steps }));
    }, "Next steps saved");

  const appointments = details?.appointments ?? [];
  return {
    details,
    /** The stamps a loyalty card needs for a reward */
    stampTarget,
    notFound,
    failed,
    today,
    tab,
    setTab,
    busy,
    notes,
    /** Notes about the client in general, and those about one visit */
    generalNotes: notes.filter((n) => !n.appointment_id),
    visitNotes: notes.filter((n) => n.appointment_id),
    notesFor: (appointmentId: number) => notes.filter((n) => n.appointment_id === appointmentId),
    visitOf: (appointmentId?: number | null) => appointments.find((a) => a.id === appointmentId),
    nextAppointment: details?.summary.nextVisit
      ? appointments.find((a) => a.status === "CONFIRMED" && a.appointment_date === details.summary.nextVisit)
      : undefined,
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
