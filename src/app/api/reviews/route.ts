import { createReview, listMyReviews } from "@/server/handlers/reviews";

export const dynamic = "force-dynamic";

export const GET = listMyReviews;
export const POST = createReview;
