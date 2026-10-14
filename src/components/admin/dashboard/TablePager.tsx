import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import Button from "../../ui/Button";

export const PAGE_SIZE = 10;

// One page of `items` (`size` rows to a page), and what the pager needs to show it
export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  const rows = items.slice((current - 1) * size, current * size);
  const first = items.length === 0 ? 0 : (current - 1) * size + 1;
  return { rows, pages, current, first, last: first === 0 ? 0 : first + rows.length - 1, total: items.length };
}

/** The same for a page the server already cut: its rows, and the total it reported */
export function pageView<T>(rows: T[], page: number, size: number, total: number): ReturnType<typeof paginate<T>> {
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pages);
  const first = rows.length === 0 ? 0 : (current - 1) * size + 1;
  return { rows, pages, current, first, last: first === 0 ? 0 : first + rows.length - 1, total };
}

const SHOWN_PAGES = 5;

// Up to five page numbers around the current page (fewer near either end of a short list)
function pageWindow(current: number, pages: number): number[] {
  const start = Math.min(Math.max(1, current - Math.floor(SHOWN_PAGES / 2)), Math.max(1, pages - SHOWN_PAGES + 1));
  return Array.from({ length: Math.min(SHOWN_PAGES, pages) }, (_, i) => start + i);
}

// "Showing 11–20 of 24", and numbered pages with previous and next, for the dashboard's tables
export default function TablePager({ view, onPage }: { view: ReturnType<typeof paginate>; onPage: (page: number) => void }) {
  const { pages, current, first, last, total } = view;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-[13px] text-gray-red/70">{`Showing ${first}–${last} of ${total}`}</p>
      {pages > 1 && (
        <nav aria-label="Pages" className="flex flex-wrap items-center gap-1">
          <Button type="button" variant="bare" aria-label="Previous page" disabled={current === 1} onClick={() => onPage(current - 1)} className="rounded-lg p-1.5 text-gray-red hover:bg-crimson-light/30 disabled:opacity-40">
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>
          {pageWindow(current, pages).map((n) => (
            <Button
              key={n}
              type="button"
              variant="bare"
              aria-label={`Page ${n}`}
              aria-current={n === current ? "page" : undefined}
              onClick={() => onPage(n)}
              className={clsx("h-8 min-w-8 rounded-lg px-2 text-[13px] font-bold", n === current ? "bg-berry text-pearl" : "text-gray-red hover:bg-crimson-light/30")}
            >
              {n}
            </Button>
          ))}
          <Button type="button" variant="bare" aria-label="Next page" disabled={current === pages} onClick={() => onPage(current + 1)} className="rounded-lg p-1.5 text-gray-red hover:bg-crimson-light/30 disabled:opacity-40">
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </nav>
      )}
    </div>
  );
}
