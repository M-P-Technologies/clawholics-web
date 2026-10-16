import { BadgeCheck, Hourglass, ImageOff, ImageUp, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import ProofUploader from "@/components/features/client/appointments/ProofUploader";
import { formatDuration, getProofState, type ProofAppointment } from "@/services/proofState";
import type { PaymentProof } from "@/services/proofService";

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
    <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold text-crimson-ink underline underline-offset-2">
      Terms &amp; Conditions<span className="sr-only"> (opens in a new tab)</span>
    </a>
  );

  return (
    <section
      id={`proof-${appointment.id}`}
      aria-label="Payment proof"
      className={clsx(
        "flex flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-white p-4 text-gray-red shadow-petal sm:p-6",
        highlighted && "ring-2 ring-crimson",
      )}
    >
      {state.kind === "needs_proof" && (
        <>
          <Heading icon={ImageUp}>Send your payment screenshot</Heading>
          <p className="text-sm text-gray-red">
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
          <Heading icon={ImageUp} danger>Your payment screenshot is overdue</Heading>
          <p className="text-sm text-gray-red">
            Please upload it as soon as you can so the salon can confirm your appointment. See our {terms}.
          </p>
          {uploader()}
        </>
      )}

      {state.kind === "in_review" && (
        <>
          <Heading icon={Hourglass}>Screenshot received</Heading>
          <p className="text-sm text-gray-red">
            The salon is reviewing it. Your appointment will be confirmed once it is approved.
          </p>
          <a href={state.proof.image_url} target="_blank" rel="noreferrer" className="self-start">
            <img
              src={state.proof.image_url}
              alt="Your uploaded screenshot"
              className="max-h-40 w-auto rounded-xl border border-crimson-light/60 object-contain"
            />
          </a>
        </>
      )}

      {state.kind === "rejected" && (
        <>
          <Heading icon={ImageOff} danger>Screenshot not accepted</Heading>
          {state.note && <p className="text-sm">Reason: {state.note}</p>}
          <p className="text-sm text-gray-red">Please upload a new screenshot of your payment.</p>
          {uploader("Upload new screenshot")}
        </>
      )}

      {state.kind === "approved" && (
        <>
          <Heading icon={BadgeCheck}>Payment verified</Heading>
          <p className="text-sm text-gray-red">Your appointment is confirmed. See you soon!</p>
        </>
      )}
    </section>
  );
}

// The card's title in the brand's display font, with its icon in a soft pink circle
function Heading({ icon: Icon, danger = false, children }: { icon: LucideIcon; danger?: boolean; children: React.ReactNode }) {
  return (
    <h3 className={clsx("flex items-center gap-3 font-display text-xl font-normal", danger ? "text-danger-ink" : "text-gray-red")}>
      <span aria-hidden="true" className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", danger ? "bg-danger/10" : "bg-crimson-light/40 text-berry")}>
        <Icon size={18} strokeWidth={1.75} />
      </span>
      {children}
    </h3>
  );
}
