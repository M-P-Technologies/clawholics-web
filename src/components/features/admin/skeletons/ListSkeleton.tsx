import { Skeleton } from "@/components/atoms";
import { CARDS_PER_PAGE } from "@/components/organisms";
import { useTableLayout } from "@/hooks/useMinWidth";

interface ListSkeletonProps {
  /** What's loading, for screen readers, e.g. "Loading appointments" */
  label: string;
  /** How many columns follow the client column in a table row */
  columns?: number;
  /** Inside a screen's own loading region: no second "loading" for screen readers */
  quiet?: boolean;
}

const ROWS = 5;

// Placeholder rows for an admin table while it loads, shaped like the real thing: from md up,
// rows of a photo, a name and the columns; on phones, cards like RowCards'. Each row's bars vary
// in width so it reads as a list rather than a grid of blocks.
export function ListSkeleton({ label, columns = 8, quiet = false }: ListSkeletonProps) {
  const asTable = useTableLayout();

  return (
    <div role={quiet ? undefined : "status"} aria-label={quiet ? undefined : label} className="flex flex-col">
      {!quiet && <span className="sr-only">{label}…</span>}
      {asTable
        ? Array.from({ length: ROWS }, (_, row) => (
            <div key={row} className="flex items-center gap-6 border-t border-dotted border-crimson-light py-3 first:border-t-0">
              <div className="flex w-55 shrink-0 items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Skeleton className={row % 2 ? "h-3.5 w-28" : "h-3.5 w-36"} />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              {Array.from({ length: columns }, (_, column) => (
                <Skeleton key={column} className={(row + column) % 3 ? "h-3.5 flex-1" : "h-3.5 flex-[0.6]"} />
              ))}
            </div>
          ))
        : Array.from({ length: Math.min(3, CARDS_PER_PAGE) }, (_, card) => (
            <div key={card} className="mb-3 flex flex-col gap-3 rounded-xl border border-crimson-light/50 bg-light-orange/30 p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              {Array.from({ length: 4 }, (_, field) => (
                <div key={field} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className={field % 2 ? "h-3 w-20" : "h-3 w-28"} />
                </div>
              ))}
            </div>
          ))}
    </div>
  );
}
