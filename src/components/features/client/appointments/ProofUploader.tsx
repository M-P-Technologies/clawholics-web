import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  isProofApiUnavailable,
  uploadProof,
  validateProofFile,
  type PaymentProof,
} from "@/services/proofService";
import { Button } from "@/components/atoms";

interface ProofUploaderProps {
  appointmentId: number;
  tokenFetcher: () => Promise<string | null>;
  clerkId?: string | null;
  buttonLabel?: string;
  onUploaded: (proof: PaymentProof) => void;
}

export default function ProofUploader({
  appointmentId,
  tokenFetcher,
  clerkId,
  buttonLabel = "Upload screenshot",
  onUploaded,
}: ProofUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = `proof-file-${appointmentId}`;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    setError(null);

    if (!picked) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }

    const problem = validateProofFile(picked);
    if (problem) {
      setFile(null);
      setPreviewUrl(null);
      setError(problem);
      return;
    }

    setFile(picked);
    setPreviewUrl(typeof URL.createObjectURL === "function" ? URL.createObjectURL(picked) : null);
  };

  const handleUpload = async () => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);

    try {
      const token = await tokenFetcher();
      const proof = await uploadProof(appointmentId, file, { token, clerkId });
      setFile(null);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
      onUploaded(proof);
    } catch (err) {
      setError(
        isProofApiUnavailable(err)
          ? "Screenshot upload isn't available yet. Please try again later."
          : err instanceof Error
            ? err.message
            : "Upload failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border-2 border-dashed border-crimson-light bg-crimson-light/10 p-4">
        <label htmlFor={inputId} className="text-[13px] font-bold text-gray-red">
          Payment screenshot <span className="font-normal">(JPG, PNG or WEBP)</span>
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          disabled={busy}
          className="w-full min-w-0 text-sm text-gray-red file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-crimson file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-on-crimson hover:file:bg-crimson-ink hover:file:text-pearl"
        />
      </div>

      {previewUrl && (
        <img
          src={previewUrl}
          alt="Screenshot preview"
          className="max-h-48 w-auto self-start rounded-lg border border-crimson-light/60 object-contain"
        />
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-danger-ink">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={handleUpload}
        disabled={!file || busy}
        className="self-start"
      >
        {busy ? "Uploading..." : buttonLabel}
      </Button>
    </div>
  );
}
