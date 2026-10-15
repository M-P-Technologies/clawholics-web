"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accountKeys, accountQueries } from "@/lib/tanstack-query/accountQueries";
import { submitReview, type Review, type ReviewDraft } from "../api/reviewService";

const NO_REVIEWS: Record<number, Review> = {};

/**
 * The signed-in client's reviews by appointment id, and a way to add one. A failed load (e.g.
 * before the reviews table exists) leaves it empty, so completed visits just offer a review.
 */
export function useMyReviews() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const clerkId = user?.id ?? "";
  const reviews = useQuery({ ...accountQueries.reviews(clerkId, getToken), enabled: !!isSignedIn && !!user }).data ?? NO_REVIEWS;

  const submit = useCallback(
    async (appointmentId: number, draft: ReviewDraft) => {
      const saved = await submitReview(appointmentId, draft, { token: await getToken(), clerkId });
      queryClient.setQueryData<Record<number, Review>>(accountKeys.reviews(clerkId), (current) => ({ ...current, [appointmentId]: saved }));
      return saved;
    },
    [getToken, clerkId, queryClient],
  );

  return { reviews, submit };
}
