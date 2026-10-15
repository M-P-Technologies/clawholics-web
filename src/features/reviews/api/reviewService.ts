import { call, type Auth } from "../../catalog/api/catalogService";
import { validateProofFile } from "../../payments/api/proofService";
import { compressImageToWebp, PHOTO_UPLOAD_OPTIONS } from "../../../lib/uploadService";

/** A client's review of a completed visit */
export interface Review {
  id: number;
  appointment_id: number;
  /** 1 to 5 stars */
  rating: number;
  comment: string;
  photo_url: string | null;
  created_at: string;
  /** 1 once an admin approved it for the home page */
  approved?: number;
}

/** An approved review, as the home page shows it */
export interface PublicReview {
  id: number;
  rating: number;
  comment: string;
  photo_url: string | null;
  created_at: string;
  service_name: string;
  /** First name and the initial of the last, e.g. "Ana C." */
  client_name: string | null;
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

/** The reviews approved for the home page */
export const fetchPublicReviews = (): Promise<PublicReview[]> => call<PublicReview[]>("/reviews/public", { method: "GET" });

/** Admin: show a review on the home page, or take it off */
export const setReviewApproval = (reviewId: number, approved: boolean, auth: Auth): Promise<{ id: number; appointment_id: number; approved: number }> =>
  call(`/reviews/${reviewId}/approval`, { method: "PUT", body: JSON.stringify({ approved }) }, auth);
