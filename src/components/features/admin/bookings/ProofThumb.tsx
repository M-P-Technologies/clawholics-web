import { useState } from "react";
import { ImagePreviewDialog } from "@/components/organisms";
import type { ProofSummary } from "@/services/proofService";

// The client's latest payment screenshot as a small thumbnail that opens it full size, or
// "None yet" when they haven't sent one
export default function ProofThumb({ proof, appointmentId }: { proof: ProofSummary | null | undefined; appointmentId: number }) {
  const [open, setOpen] = useState(false);
  if (!proof?.image_url) return <span className="text-xs text-gray-red">None yet</span>;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View payment screenshot for appointment #${appointmentId}`}
        className="block h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-crimson-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- R2's image host */}
        <img src={proof.image_url} alt="" className="h-full w-full object-cover" />
      </button>
      <ImagePreviewDialog
        imageUrl={open ? proof.image_url : null}
        title="Payment screenshot"
        alt={`Payment screenshot for appointment #${appointmentId}`}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
