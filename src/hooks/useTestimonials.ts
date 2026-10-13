import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import type { PublicReview } from "../services/reviewService";

// The approved reviews for the home page. None until they load, and none if they can't be
// loaded (the section is simply left out).
const NO_REVIEWS: PublicReview[] = [];

export function useTestimonials() {
  return useQuery(publicQueries.reviews()).data ?? NO_REVIEWS;
}
