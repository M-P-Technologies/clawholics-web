import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/molecules";
import { adminDataChanged } from "../../lib/adminQueries";
import { BALANCE_METHODS, MAX_COMPLETION_PHOTOS, expectedBalance, type BalanceMethod } from "../../lib/visitCompletion";
import { saveCompletion, type VisitToComplete } from "../../services/completionService";

const peso = (n: number) => `₱${n.toLocaleString("en-US")}`;
const manilaToday = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

/** The Complete visit form: the balance (prefilled, editable), how it was paid, who did it, photos */
export function useCompleteVisit(visit: VisitToComplete, onSaved?: () => void) {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const auto = expectedBalance(visit.price, visit.paid_downpayment);
  const saved = visit.completion;

  const [editing, setEditing] = useState(false);
  const [balance, setBalance] = useState(String(saved?.balance_amount ?? auto));
  const [method, setMethod] = useState<BalanceMethod>(saved?.payment_method ?? "Cash");
  const [artistId, setArtistId] = useState(String(saved?.nailist_id ?? visit.nailist_id ?? ""));
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const status = visit.status.trim().toUpperCase();
  const completed = status === "COMPLETED";
  // A confirmed visit, from its day on; a completed one while it's being corrected
  const formOpen = (status === "CONFIRMED" && visit.appointment_date <= manilaToday()) || (completed && editing);

  const addPhotos = (files: FileList | null) => {
    const picked = [...photos, ...Array.from(files ?? [])];
    setPhotos(picked.slice(0, MAX_COMPLETION_PHOTOS));
    setError(picked.length > MAX_COMPLETION_PHOTOS ? `Up to ${MAX_COMPLETION_PHOTOS} photos at a time.` : "");
  };

  const submit = async () => {
    if (!/^\d+$/.test(balance.trim())) return setError("Enter the balance in whole pesos, 0 or more.");
    if (!artistId) return setError("Choose the artist who did the nails.");
    setBusy(true);
    setError("");
    try {
      await saveCompletion(
        visit.id,
        { balance_amount: Number(balance.trim()), payment_method: method, nailist_id: Number(artistId), photos },
        { token: await getToken(), clerkId: userId },
      );
      setPhotos([]);
      setEditing(false);
      toast.show("success", "Visit completed", photos.length ? `Saved, and ${photos.length} photo${photos.length === 1 ? "" : "s"} added to the artist's gallery.` : "Saved.");
      void adminDataChanged(queryClient);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "The visit wasn't saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return {
    formOpen,
    completed,
    /** What was recorded, e.g. "₱1,300 · GCash · Miss Jean" */
    summary: saved ? [peso(saved.balance_amount), saved.payment_method, saved.nailist_name].filter(Boolean).join(" · ") : "",
    startEditing: () => setEditing(true),
    cancelEditing: () => setEditing(false),
    balance,
    setBalance,
    autoLabel: `Use ${peso(auto)}`,
    useAuto: () => setBalance(String(auto)),
    isAuto: balance === String(auto),
    method,
    setMethod,
    methods: BALANCE_METHODS,
    artistId,
    setArtistId,
    photos,
    addPhotos,
    removePhoto: (index: number) => setPhotos((list) => list.filter((_, i) => i !== index)),
    busy,
    error,
    submit,
  };
}
