import { useEffect, useState } from "react";

interface FitRowsOptions {
  /** The attribute each measured row carries (`data-…`) */
  rowAttribute: string;
  /** Rows when the two columns aren't side by side, and before anything is measured */
  fallback: number;
  fewest: number;
  most: number;
  /** The media query from which the two columns sit side by side */
  sideBySide: string;
  /** Compare the columns by the height their content needs, not the height they are drawn at: for
   *  columns the grid stretches to each other, which would otherwise always measure level */
  natural?: boolean;
}

// The height an element's own content needs: from its first child's top to its last child's bottom,
// with its padding and borders. Its children must not be stretched to fill it.
function naturalHeight(element: HTMLElement) {
  const first = element.firstElementChild;
  const last = element.lastElementChild;
  if (!first || !last) return element.getBoundingClientRect().height;
  const style = getComputedStyle(element);
  const edges = ["paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth"] as const;
  return last.getBoundingClientRect().bottom - first.getBoundingClientRect().top + edges.reduce((sum, edge) => sum + (parseFloat(style[edge]) || 0), 0);
}

// How many rows a list shows so its column ends level with the one beside it: as many as fit (fewest
// to most) when the columns are side by side, the fallback when stacked. `column` is the list's own
// column and `beside` the one it is matched to; neither may be stretched to the other's height, or
// there is nothing to measure. It measures again whenever either changes size (content loading, a
// tab switch, the window).
export function useFitRows({ rowAttribute, fallback, fewest, most, sideBySide, natural = false }: FitRowsOptions) {
  const [column, setColumn] = useState<HTMLElement | null>(null);
  const [beside, setBeside] = useState<HTMLElement | null>(null);
  const [rows, setRows] = useState(fallback);

  useEffect(() => {
    if (!column || !beside || typeof ResizeObserver === "undefined") return;
    const query = window.matchMedia?.(sideBySide);
    const fit = () => {
      if (!query?.matches) return setRows(fallback);
      const shown = [...column.querySelectorAll(`[${rowAttribute}]`)];
      if (shown.length === 0) return;
      // By the tallest row, so a taller one coming in can't push the column past the other and back
      const rowHeight = Math.max(...shown.map((row) => row.getBoundingClientRect().height));
      const height = (element: HTMLElement) => (natural ? naturalHeight(element) : element.getBoundingClientRect().height);
      const spare = height(beside) - height(column);
      setRows(Math.min(most, Math.max(fewest, shown.length + Math.floor(spare / rowHeight))));
    };
    // The observer measures once on its own when it starts
    const observer = new ResizeObserver(fit);
    observer.observe(column);
    observer.observe(beside);
    query?.addEventListener?.("change", fit);
    return () => {
      observer.disconnect();
      query?.removeEventListener?.("change", fit);
    };
  }, [column, beside, rowAttribute, fallback, fewest, most, sideBySide, natural]);

  return { columnRef: setColumn, besideRef: setBeside, rows };
}
