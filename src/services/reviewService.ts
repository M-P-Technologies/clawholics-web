import { call, type Auth } from "./catalogService";
import { validateProofFile } from "./proofService";
import { compressImageToWebp, PHOTO_UPLOAD_OPTIONS } from "./uploadService";

/** A client's review of a completed visit */
export interface Review {
  id: number;
  appointment_id: number;
  /** 1 to 5 stars */
  rating: number;
  comment: string;
  photo_url: string | null;
  created_at: string;
}

export interface ReviewDraft {
  rating: number;
  comment: string;
  photo: File | null;
}

/** The signed-in client's reviews */
export const fetchMyReviews = (auth: Auth): Promise<Review[]> => call<Review[]>("/reviews", { method: "GET" }, auth);

// The photo goes up in the same multipart request as the review, compressed like other photos
// (and checked by the same rules as a payment proof: JPG, PNG or WEBP, 8MB at most before).
export const submitReview = async (appointmentId: number, draft: ReviewDraft, auth: Auth): Promise<Review> => {
  const form = new FormData();
  form.append("appointment_id", String(appointmentId));
  form.append("rating", String(draft.rating));
  form.append("comment", draft.comment.trim());
  if (draft.photo) {
    const invalid = validateProofFile(draft.photo);
    if (invalid) throw new Error(invalid);
    form.append("file", await compressImageToWebp(draft.photo, PHOTO_UPLOAD_OPTIONS));
  }
  return call<Review>("/reviews", { method: "POST", body: form }, auth);
};
