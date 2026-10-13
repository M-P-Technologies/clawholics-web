"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { fetchMyReviews, submitReview, type Review, type ReviewDraft } from "../services/reviewService";

/**
 * The signed-in client's reviews by appointment id, and a way to add one. A failed load (e.g.
 * before the reviews table exists) leaves it empty, so completed visits just offer a review.
 */
export function useMyReviews() {
  const { getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const [reviews, setReviews] = useState<Record<number, Review>>({});

  const auth = useCallback(async () => ({ token: await getToken(), clerkId: user?.id }), [getToken, user?.id]);

  useEffect(() => {
    if (!isSignedIn) return;
    let live = true;
    (async () => {
      try {
        const list = await fetchMyReviews(await auth());
        if (live) setReviews(Object.fromEntries(list.map((r) => [r.appointment_id, r])));
      } catch {
        // No reviews to show; the client can still leave one
      }
    })();
    return () => {
      live = false;
    };
  }, [isSignedIn, auth]);

  const submit = useCallback(
    async (appointmentId: number, draft: ReviewDraft) => {
      const saved = await submitReview(appointmentId, draft, await auth());
      setReviews((current) => ({ ...current, [appointmentId]: saved }));
      return saved;
    },
    [auth],
  );

  return { reviews, submit };
}
