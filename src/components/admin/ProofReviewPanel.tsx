import { useCallback,useEffect,useRef,useState } from "react";
import type { Auth } from "../../services/catalogService";
import {
fetchProofs,
isProofApiUnavailable,
reviewProof,
type PaymentProof,
type ProofReview,
type ProofSummary,
} from "../../services/proofService";
import { getProofState } from "../../services/proofState";
import { parseServerTime } from "../../services/serverTime";
import ImagePreviewModal from "./ImagePreviewModal";
import Button from "../ui/Button";

interface Props {
  appointmentId: number;
  status: string;
  proofDueAt?: string | null;
  latestProof?: ProofSummary | null;
  tokenFetcher: () => Promise<string | null>;
  clerkId?: string | null;
  onReviewed: (proof: PaymentProof) => void;
}

const formatWhen = (value?: string | null) => {
  const time = parseServerTime(value);
  return Number.isNaN(time) ? "" : new Date(time).toLocaleString();
};


export default function ProofReviewPanel({
  appointmentId,
  status,
  proofDueAt,
  latestProof,
  tokenFetcher,
  clerkId,
  onReviewed,
}: Props) {
  const [history, setHistory] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);

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

  const load = useCallback(async () => {
    try {
      const list = await fetchProofs(appointmentId, await getAuth());
      const sorted = [...list].sort(
        (a, b) => parseServerTime(b.created_at) - parseServerTime(a.created_at) || b.id - a.id,
      );
      setHistory(sorted);
      setUnavailable(false);
    } catch (err) {
      if (isProofApiUnavailable(err)) setUnavailable(true);
      else setError(err instanceof Error ? err.message : "Failed to load proofs.");
    } finally {
      setLoading(false);
    }
  }, [appointmentId, getAuth]);

  useEffect(() => {
    load();
  }, [load]);

  const latest: ProofSummary | null = history[0] ?? latestProof ?? null;
  const state = getProofState({ status, proof_due_at: proofDueAt, latest_proof: latest }, Date.now());
  const canReview = latest?.status === "PENDING" && status.trim().toUpperCase() === "AWAITING_PROOF";

  const submit = async (review: ProofReview) => {
    if (!latest || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await reviewProof(latest.id, review, await getAuth());
      setMode("idle");
      setRejectNote("");
      onReviewed(result);
      await load();
    } catch (err) {
      setError(
        isProofApiUnavailable(err)
          ? "Proof review isn't available yet."
          : err instanceof Error
            ? err.message
            : "Review failed.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Payment proof review" className="rounded-xl bg-crimson-light/15 px-4 py-4 text-gray-red sm:px-5">
      <p className="mb-2 text-[14px] font-bold uppercase">Payment proof</p>

      {loading && <p className="text-[13px]">Loading proof...</p>}

      {!loading && unavailable && <p className="text-[13px]">Proof review isn't available yet.</p>}

      {!loading && !unavailable && (
        <div className="flex flex-col gap-4">
          {state.kind === "overdue" && (
            <p className="rounded-sm bg-danger/10 px-4 py-2 text-[13px] font-bold text-danger">
              Proof overdue: the client has not uploaded a screenshot yet.
            </p>
          )}
          {state.kind === "needs_proof" && !latest && (
            <p className="text-[13px] italic">Waiting for the client's screenshot.</p>
          )}

          {latest && (
            <Button variant="bare" type="button" onClick={() => setZoomUrl(latest.image_url)} className="self-start">
              <img
                src={latest.image_url}
                alt="Latest payment screenshot"
                className="max-h-48 w-auto rounded-sm border border-crimson/30 object-contain"
              />
            </Button>
          )}

          {error && (
            <p role="alert" className="text-[13px] font-medium text-danger">
              {error}
            </p>
          )}

          {canReview && mode === "idle" && (
            <div className="flex gap-2">
              <Button type="button" onClick={() => setMode("approve")} >
                Approve
              </Button>
              <Button variant="secondary" type="button" onClick={() => setMode("reject")} >
                Reject
              </Button>
            </div>
          )}

          {canReview && mode === "approve" && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-bold">
                Approving confirms this appointment and emails the client.
              </p>
              <div className="flex gap-2">
                <Button type="button" onClick={() => submit({ status: "APPROVED" })} disabled={busy} >
                  Confirm approve
                </Button>
                <Button variant="secondary" type="button" onClick={() => setMode("idle")} disabled={busy} >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {canReview && mode === "reject" && (
            <div className="flex flex-col gap-2">
              <label htmlFor={`reject-note-${appointmentId}`} className="text-[12px] font-bold uppercase">
                Reason for rejection
              </label>
              <textarea
                id={`reject-note-${appointmentId}`}
                rows={2}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                className="w-full rounded-md border border-crimson-light bg-milk px-4 py-2 text-[13px] text-gray-red outline-none focus:ring-2 focus:ring-crimson"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => submit({ status: "REJECTED", admin_note: rejectNote.trim() })}
                  disabled={busy || !rejectNote.trim()}
                  
                >
                  Confirm reject
                </Button>
                <Button variant="secondary" type="button" onClick={() => setMode("idle")} disabled={busy} >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <ul className="flex flex-col gap-1 text-[12px]">
              {history.map((p) => (
                <li key={p.id} className="rounded-md bg-milk px-4 py-1.5">
                  <span className="font-bold">{p.status}</span>
                  {formatWhen(p.created_at) ? ` · ${formatWhen(p.created_at)}` : ""}
                  {p.admin_note ? ` · ${p.admin_note}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ImagePreviewModal imageUrl={zoomUrl} title="Payment screenshot" onClose={() => setZoomUrl(null)} />
    </section>
  );
}
