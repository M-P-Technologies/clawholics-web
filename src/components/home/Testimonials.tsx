import type { PublicReview } from "../../services/reviewService";
import { Stars } from "@/components/atoms";

// What clients said about their visits: only the reviews an admin approved for the home page
export default function Testimonials({ reviews }: { reviews: PublicReview[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
      {reviews.map((review) => (
        <li key={review.id} className="flex flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-6 shadow-petal">
          <Stars rating={review.rating} />
          {review.comment && <blockquote className="whitespace-pre-wrap text-sm leading-relaxed text-gray-red [overflow-wrap:anywhere]">{review.comment}</blockquote>}
          {review.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- R2 images, sized by CSS like the rest of the site
            <img src={review.photo_url} alt={`${review.client_name ?? "A client"}'s nails`} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
          )}
          <p className="mt-auto flex flex-col text-[13px] text-gray-red">
            <span className="font-bold text-gray-red">{review.client_name ?? "A happy client"}</span>
            {review.service_name}
          </p>
        </li>
      ))}
    </ul>
  );
}
