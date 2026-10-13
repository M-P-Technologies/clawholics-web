import { ImagePlus, X } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import { validateProofFile } from "../../services/proofService";
import type { Review, ReviewDraft } from "../../services/reviewService";
import Button from "../ui/Button";
import { StarPicker, Stars } from "../ui/StarRating";

interface ReviewCardProps {
  appointmentId: number;
  /** The client's review of this visit, once they've left one */
  review?: Review;
  onSubmit: (appointmentId: number, draft: ReviewDraft) => Promise<unknown>;
}

const cardClass = "flex flex-col gap-3 rounded-sm border border-crimson-light/80 bg-light-orange p-4 text-gray-red";

// A completed visit's review: the form to leave one (stars, a few words, a photo), or the review left
export default function ReviewCard({ appointmentId, review, onSubmit }: ReviewCardProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => () => void (previewUrl && URL.revokeObjectURL(previewUrl)), [previewUrl]);

  if (review) {
    return (
      <section aria-label="Your review" className={cardClass}>
        <h5 className="text-base font-bold">Your review</h5>
        <Stars rating={review.rating} />
        {review.comment && <p className="whitespace-pre-wrap text-sm">{review.comment}</p>}
        {review.photo_url && (
          <a href={review.photo_url} target="_blank" rel="noreferrer" className="self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={review.photo_url} alt="Your review photo" className="h-28 w-28 rounded-sm object-cover" />
          </a>
        )}
        <p className="copy-note">Thank you for telling us about your visit!</p>
      </section>
    );
  }

  const pickPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!picked) return;
    const problem = validateProofFile(picked);
    setError(problem);
    if (problem) return;
    setPhoto(picked);
    setPreviewUrl(typeof URL.createObjectURL === "function" ? URL.createObjectURL(picked) : null);
  };

  const removePhoto = () => {
    setPhoto(null);
    setPreviewUrl(null);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(appointmentId, { rating, comment, photo });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Your review wasn't sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const inputId = `review-photo-${appointmentId}`;
  return (
    <section aria-label="Leave a review" className={cardClass}>
      <div>
        <h5 className="text-base font-bold">How was your visit?</h5>
        <p className="text-sm opacity-80">Rate it and tell us about it. A photo of your nails is welcome too.</p>
      </div>
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        aria-label="Your review"
        rows={3}
        maxLength={1000}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What did you love? Anything we could do better?"
        className="w-full rounded-sm border border-crimson-light bg-milk px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-crimson"
      />
      {previewUrl ? (
        <div className="relative self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Your photo" className="h-24 w-24 rounded-sm object-cover" />
          <Button type="button" variant="bare" onClick={removePhoto} aria-label="Remove photo" className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-berry text-pearl">
            <X size={14} aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <label htmlFor={inputId} className="flex cursor-pointer items-center gap-2 self-start text-sm font-bold text-berry underline underline-offset-4">
          <ImagePlus size={16} aria-hidden="true" />
          Add a photo
        </label>
      )}
      <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} className="sr-only" />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <Button type="button" onClick={send} loading={busy} disabled={rating === 0} className="w-full">
        Send review
      </Button>
    </section>
  );
}
