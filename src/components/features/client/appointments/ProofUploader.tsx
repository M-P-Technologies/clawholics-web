import { useEffect, useState } from "react";
import {
  isProofApiUnavailable,
  uploadProof,
  validateProofFile,
  type PaymentProof,
} from "@/services/proofService";
import { Button } from "@/components/atoms";
import { DropArea } from "@/components/molecules/DropArea";

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
  const inputId = `proof-file-${appointmentId}`;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (picked: File | null) => {
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
      <DropArea
        id={inputId}
        disabled={busy}
        inputLabel="Payment screenshot"
        label={file ? "Choose another screenshot" : "Add your payment screenshot"}
        hint="JPG, PNG or WEBP. Click, or drop it here."
        onFile={(f) => handleFile(f ?? null)}
      />
      {file && <p className="truncate text-xs font-bold text-gray-red">{file.name}</p>}

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
