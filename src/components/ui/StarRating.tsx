import { Star } from "lucide-react";
import clsx from "clsx";

const STARS = [1, 2, 3, 4, 5];

/** A 1-5 star rating, read-only */
export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="inline-flex shrink-0 gap-0.5">
      {STARS.map((n) => (
        <Star key={n} size={size} aria-hidden="true" className={n <= rating ? "fill-crimson text-crimson" : "text-crimson-light"} />
      ))}
    </span>
  );
}

/** Picks a 1-5 star rating: a radio group, one star per choice */
export function StarPicker({ value, onChange, label = "Rating" }: { value: number; onChange: (rating: number) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {STARS.map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
          onClick={() => onChange(n)}
          className="rounded-sm p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
        >
          <Star size={30} aria-hidden="true" className={clsx("transition-colors", n <= value ? "fill-crimson text-crimson" : "text-crimson-light hover:text-crimson")} />
        </button>
      ))}
    </div>
  );
}
