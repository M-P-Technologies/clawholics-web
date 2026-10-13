import { useEffect, useState } from "react";
import { fetchPublicReviews, type PublicReview } from "../services/reviewService";

// The approved reviews for the home page. None until they load, and none if they can't be
// loaded (the section is simply left out).
export function useTestimonials() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  useEffect(() => {
    let live = true;
    fetchPublicReviews().then(
      (list) => live && setReviews(list),
      () => {},
    );
    return () => {
      live = false;
    };
  }, []);
  return reviews;
}
