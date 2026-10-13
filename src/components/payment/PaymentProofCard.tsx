import ProofUploader from "./ProofUploader";
import { formatDuration, getProofState, type ProofAppointment } from "../../services/proofState";
import type { PaymentProof } from "../../services/proofService";

interface PaymentProofCardProps {
  appointment: ProofAppointment & { id: number };
  now: number;
  tokenFetcher: () => Promise<string | null>;
  clerkId?: string | null;
  highlighted?: boolean;
  onUploaded?: (proof: PaymentProof) => void;
}

export default function PaymentProofCard({
  appointment,
  now,
  tokenFetcher,
  clerkId,
  highlighted = false,
  onUploaded,
}: PaymentProofCardProps) {
  const state = getProofState(appointment, now);
  if (state.kind === "none") return null;

  const uploader = (label?: string) => (
    <ProofUploader
      appointmentId={appointment.id}
      tokenFetcher={tokenFetcher}
      clerkId={clerkId}
      buttonLabel={label}
      onUploaded={(proof) => onUploaded?.(proof)}
    />
  );

  const terms = (
    <a href="/terms" className="underline font-bold">
      Terms &amp; Conditions
    </a>
  );

  return (
    <section
      id={`proof-${appointment.id}`}
      aria-label="Payment proof"
      className={`flex flex-col gap-3 rounded-xl border border-crimson-light/60 bg-light-orange/40 p-4 text-gray-red ${
        highlighted ? "ring-2 ring-crimson" : ""
      }`}
    >
      {state.kind === "needs_proof" && (
        <>
          <h5 className="text-base font-bold md:text-lg">Send your payment screenshot</h5>
          <p className="text-sm opacity-90">
            We received your downpayment. Upload a screenshot of it so we can confirm your appointment, as stated in
            our {terms}.
          </p>
          {state.msLeft !== null && (
            <p className="text-sm font-bold">Time left to upload: {formatDuration(state.msLeft)}</p>
          )}
          {uploader()}
        </>
      )}

      {state.kind === "overdue" && (
        <>
          <h5 className="text-base font-bold text-danger md:text-lg">Your payment screenshot is overdue</h5>
          <p className="text-sm opacity-90">
            Please upload it as soon as you can so the salon can confirm your appointment. See our {terms}.
          </p>
          {uploader()}
        </>
      )}

      {state.kind === "in_review" && (
        <>
          <h5 className="text-base font-bold md:text-lg">Screenshot received</h5>
          <p className="text-sm opacity-90">
            The salon is reviewing it. Your appointment will be confirmed once it is approved.
          </p>
          <a href={state.proof.image_url} target="_blank" rel="noreferrer" className="self-start">
            <img
              src={state.proof.image_url}
              alt="Your uploaded screenshot"
              className="max-h-32 w-auto rounded-lg border border-crimson-light/60 object-contain"
            />
          </a>
        </>
      )}

      {state.kind === "rejected" && (
        <>
          <h5 className="text-base font-bold text-danger md:text-lg">Screenshot not accepted</h5>
          {state.note && <p className="text-sm">Reason: {state.note}</p>}
          <p className="text-sm opacity-90">Please upload a new screenshot of your payment.</p>
          {uploader("Upload new screenshot")}
        </>
      )}

      {state.kind === "approved" && (
        <>
          <h5 className="text-base font-bold md:text-lg">Payment verified</h5>
          <p className="text-sm opacity-90">Your appointment is confirmed. See you soon!</p>
        </>
      )}
    </section>
  );
}
