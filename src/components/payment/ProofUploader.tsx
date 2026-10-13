import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  isProofApiUnavailable,
  uploadProof,
  validateProofFile,
  type PaymentProof,
} from "../../services/proofService";
import Button from "../ui/Button";

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-[12px] text-gray-red/70">
          Payment screenshot
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          disabled={busy}
          className="text-sm text-gray-red file:mr-4 file:cursor-pointer file:rounded-full file:border file:border-crimson-light file:bg-milk file:px-4 file:py-1.5 file:text-[13px] file:font-bold file:text-berry"
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
        <p role="alert" className="text-sm font-medium text-danger">
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
