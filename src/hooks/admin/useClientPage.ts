"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../components/ui/ToastProvider";
import { manilaToday, type ClientTab } from "../../lib/admin/clientPage";
import { useParams } from "../../lib/router";
import {
  addNote,
  deleteNote,
  fetchClient,
  fetchNextSteps,
  fetchNotes,
  saveNextSteps,
  type ClientDetails,
  type ClientNote,
} from "../../services/clientNotesService";
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
  const { getToken } = useAuth();
  const { user } = useUser();
  const [details, setDetails] = useState<ClientDetails | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [steps, setSteps] = useState("");
  const [draft, setDraft] = useState("");
  const [visitDraft, setVisitDraft] = useState<VisitDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<ClientTab>("overview");
  // Today in Manila, for the booking to track
  const [today] = useState(manilaToday);

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
    setDetails((current) =>
      current && { ...current, appointments: current.appointments.map((a) => (a.review_id === reviewId ? { ...a, review_approved: approved ? 1 : 0 } : a)) },
    );
  };
  const saveSteps = () => run(async () => saveNextSteps(clientId, steps, await auth()), "Next steps saved");

  const appointments = details?.appointments ?? [];
  return {
    details,
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
