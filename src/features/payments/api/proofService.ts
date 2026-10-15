import { ApiError, call, type Auth } from "../../catalog/api/catalogService";
import { compressImageToWebp, type UploadOptions } from "../../../lib/uploadService";

type ProofStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ProofSummary {
  id: number;
  status: ProofStatus;
  image_url: string;
  admin_note?: string | null;
  created_at: string;
}

export interface PaymentProof extends ProofSummary {
  appointment_id: number;
  user_id: number;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
}

export interface ProofReview {
  status: "APPROVED" | "REJECTED";
  admin_note?: string;
}

const PROOF_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PROOF_MAX_ORIGINAL_MB = 8;

// Payment screenshots hold small text, so they keep more detail than other uploads.
export const PROOF_UPLOAD_OPTIONS: UploadOptions = {
  maxWidthOrHeight: 1600,
  maxSizeKB: 400,
};

export const validateProofFile = (file: File): string | null => {
  if (!PROOF_ALLOWED_TYPES.includes(file.type)) {
    return "Only JPG, PNG, or WEBP images are allowed.";
  }
  if (file.size > PROOF_MAX_ORIGINAL_MB * 1024 * 1024) {
    return `Image must be ${PROOF_MAX_ORIGINAL_MB}MB or smaller.`;
  }
  return null;
};

// The backend may not be deployed yet; callers show a friendly message for this.
export const isProofApiUnavailable = (err: unknown): boolean =>
  err instanceof ApiError && err.status === 404;

export const fetchProofs = (appointmentId: number, auth: Auth): Promise<PaymentProof[]> =>
  call<PaymentProof[]>(`/payment/proofs?appointment_id=${appointmentId}`, { method: "GET" }, auth);

// The API stores the proof itself (under a random, unguessable name), so the compressed image
// goes up in the same multipart request as the appointment id.
export const uploadProof = async (
  appointmentId: number,
  file: File,
  auth: Auth,
): Promise<PaymentProof> => {
  const invalid = validateProofFile(file);
  if (invalid) throw new Error(invalid);

  const compressed = await compressImageToWebp(file, PROOF_UPLOAD_OPTIONS);
  if (compressed.size > PROOF_UPLOAD_OPTIONS.maxSizeKB! * 1024) {
    throw new Error(`Compressed image is still larger than ${PROOF_UPLOAD_OPTIONS.maxSizeKB}KB. Please upload a smaller image.`);
  }

  const form = new FormData();
  form.append("file", compressed);
  form.append("appointment_id", String(appointmentId));
  return call<PaymentProof>("/payment/proofs", { method: "POST", body: form }, auth);
};

export const reviewProof = (
  proofId: number,
  review: ProofReview,
  auth: Auth,
): Promise<PaymentProof> =>
  call<PaymentProof>(
    `/payment/proofs/${proofId}/review`,
    { method: "PUT", body: JSON.stringify(review) },
    auth,
  );
