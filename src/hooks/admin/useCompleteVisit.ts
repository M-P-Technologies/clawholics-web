import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/molecules";
import { adminDataChanged } from "../../lib/adminQueries";
import { BALANCE_METHODS, expectedBalance, lateFee, minutesLate, type BalanceMethod } from "../../lib/visitCompletion";
import { saveCompletion, type VisitToComplete } from "../../services/completionService";
import { checkVoucherForVisit } from "../../services/voucherService";

const peso = (n: number) => `₱${n.toLocaleString("en-US")}`;
const manilaToday = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return MONTHS[m - 1] ? `${MONTHS[m - 1]} ${d}, ${y}` : ymd;
};

/**
 * The Complete visit form: when the client came in (the late fee follows the salon's terms), their
 * birthday voucher code if they show one (checked with the server, its discount comes off the
 * service price), the balance (prefilled with the service's balance less that discount plus the
 * fee, editable), how it was paid, who did it, and photos (optional: they can be added later).
 * Shown locked before the visit's day.
 */
export function useCompleteVisit(visit: VisitToComplete, onSaved?: () => void) {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const saved = visit.completion;

  const [editing, setEditing] = useState(false);
  const [arrivedAt, setArrivedAt] = useState(saved?.arrived_at ?? "");
  // The balance follows the prefill until the admin types their own
  const [typedBalance, setTypedBalance] = useState<string | null>(saved ? String(saved.balance_amount) : null);
  const [method, setMethod] = useState<BalanceMethod>(saved?.payment_method ?? "Cash");
  const [artistId, setArtistId] = useState(String(saved?.nailist_id ?? visit.nailist_id ?? ""));
  // The visit's photo is added afterwards, in its own window (VisitPhotoDialog)
  const [photoOpen, setPhotoOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The birthday voucher: the code typed, and the one applied once the server accepted it
  const [voucherInput, setVoucherInput] = useState(saved?.voucher_code ?? "");
  const [voucher, setVoucher] = useState<{ code: string; discount: number } | null>(
    saved?.voucher_code ? { code: saved.voucher_code, discount: saved.voucher_discount ?? 0 } : null,
  );
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState("");

  const discount = voucher?.discount ?? 0;
  const base = expectedBalance(visit.price === null ? null : Math.max(0, visit.price - discount), visit.paid_downpayment);

  const minutes = minutesLate(visit.appointment_time, arrivedAt);
  const late = lateFee(minutes);
  const auto = base + late.fee;
  const balance = typedBalance ?? String(auto);

  const status = visit.status.trim().toUpperCase();
  const completed = status === "COMPLETED";
  const confirmed = status === "CONFIRMED";
  const locked = confirmed && visit.appointment_date > manilaToday();
  const formOpen = confirmed || (completed && editing);

  const applyVoucher = async () => {
    if (!voucherInput.trim()) return setVoucherError("Enter the code the client shows you.");
    setCheckingVoucher(true);
    setVoucherError("");
    try {
      const found = await checkVoucherForVisit(voucherInput, visit.id, { token: await getToken(), clerkId: userId });
      setVoucher({ code: found.code, discount: found.discount });
      setVoucherInput(found.code);
      // The balance follows the new discount, even one typed or saved before
      setTypedBalance(null);
    } catch (e) {
      setVoucher(null);
      setVoucherError(e instanceof Error && e.message ? e.message : "The code couldn't be checked. Please try again.");
    } finally {
      setCheckingVoucher(false);
    }
  };
  const removeVoucher = () => {
    setVoucher(null);
    setVoucherInput("");
    setVoucherError("");
    setTypedBalance(null);
  };

  const submit = async () => {
    if (locked) return;
    const typedCode = voucherInput.trim().toUpperCase();
    if (typedCode && typedCode !== voucher?.code) return setError("Apply the voucher code first, or clear it.");
    if (!/^\d+$/.test(balance.trim())) return setError("Enter the balance in whole pesos, 0 or more.");
    if (!artistId) return setError("Choose the artist who did the nails.");
    setBusy(true);
    setError("");
    try {
      await saveCompletion(
        visit.id,
        { balance_amount: Number(balance.trim()), payment_method: method, nailist_id: Number(artistId), arrived_at: arrivedAt.trim(), voucher_code: voucher?.code ?? "", photos: [] },
        { token: await getToken(), clerkId: userId },
      );
      setEditing(false);
      toast.show("success", "Visit completed", saved?.photo_url ? "Saved." : "Saved. Add the nail photo when you have it.");
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
    locked,
    lockedNote: `You can complete this visit from ${dayLabel(visit.appointment_date)}.`,
    completed,
    /** What was recorded, e.g. "₱1,300 · GCash · Miss Jean" */
    summary: saved
      ? [peso(saved.balance_amount), saved.payment_method, saved.nailist_name, saved.voucher_code && `Voucher −${peso(saved.voucher_discount ?? 0)}`]
          .filter(Boolean)
          .join(" · ")
      : "",
    /** Completed without its nail photo yet: added with the photo window */
    photosMissing: completed && Boolean(saved) && !saved?.photo_url && (saved?.photos_added ?? 0) === 0,
    hasPhoto: Boolean(saved?.photo_url),
    photoOpen,
    openPhoto: () => setPhotoOpen(true),
    closePhoto: () => setPhotoOpen(false),
    startEditing: () => setEditing(true),
    cancelEditing: () => setEditing(false),
    arrivedAt,
    setArrivedAt,
    /** "Late fee (17 min late): ₱100", or empty when on time */
    lateLine: late.fee > 0 && minutes !== null ? `Late fee (${minutes} min late): ${peso(late.fee)}` : "",
    /** 25 minutes or more late: the terms cancel the visit */
    lateCancel: late.cancel,
    voucherInput,
    setVoucherInput,
    /** "BDAY-… applied: −₱300 off the service price", once the server accepted the code */
    voucherLine: voucher ? `${voucher.code} applied: −${peso(voucher.discount)} off the service price` : "",
    voucherApplied: Boolean(voucher),
    applyVoucher,
    removeVoucher,
    checkingVoucher,
    voucherError,
    balance,
    setBalance: (value: string) => setTypedBalance(value),
    autoLabel: `Use ${peso(auto)}`,
    useAuto: () => setTypedBalance(null),
    isAuto: balance === String(auto),
    method,
    setMethod,
    methods: BALANCE_METHODS,
    artistId,
    setArtistId,
    busy,
    error,
    submit,
  };
}
