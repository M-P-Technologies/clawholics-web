import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { pageNumbers } from "../../utils/pagination";
import Button from "./Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const base =
  "flex h-10 min-w-10 items-center justify-center rounded-md border px-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40";

// Previous / numbers / Next under a long list. Nothing is shown when everything fits on one page.
export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-2">
      <Button
        variant="bare"
        type="button"
        aria-label="Previous page"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className={clsx(base, "border-crimson-light text-gray-red hover:border-crimson hover:text-crimson")}
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </Button>

      {pageNumbers(page, totalPages).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} aria-hidden="true" className="px-1 text-gray-red/60">
            …
          </span>
        ) : (
          <Button
            variant="bare"
            key={n}
            type="button"
            aria-label={`Page ${n}`}
            aria-current={n === page ? "page" : undefined}
            onClick={() => onPageChange(n)}
            className={clsx(
              base,
              n === page
                ? "border-crimson bg-crimson text-light-orange shadow-md shadow-crimson/30"
                : "border-crimson-light text-gray-red hover:border-crimson hover:text-crimson",
            )}
          >
            {n}
          </Button>
        ),
      )}

      <Button
        variant="bare"
        type="button"
        aria-label="Next page"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className={clsx(base, "border-crimson-light text-gray-red hover:border-crimson hover:text-crimson")}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </Button>
    </nav>
  );
}
