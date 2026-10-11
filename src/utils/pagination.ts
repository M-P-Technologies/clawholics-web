export const PAGE_SIZE = 9;

/** The page numbers to show: all of them when there are few, otherwise the first, the last and the neighbours of the current one, with null where numbers are skipped. */
export function pageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set([1, total, current - 1, current, current + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}
