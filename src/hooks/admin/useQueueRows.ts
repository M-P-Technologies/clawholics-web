import { useEffect, useState } from "react";
import { ATTENTION_MOST, ATTENTION_ROWS } from "@/lib/admin/attention";

/** Put on each of the queue's rows, so they can be measured */
export const QUEUE_ROW = "data-queue-row";
const FEWEST = 3;

// How many rows the dashboard's To act on queue shows: from lg up, where its column sits beside the
// notes and active bookings, as many as keep the two columns level (3 to 15); stacked, five. It
// measures again whenever either column changes size (the notes loading, a tab switch, the window).
export function useQueueRows() {
  const [column, setColumn] = useState<HTMLElement | null>(null);
  const [beside, setBeside] = useState<HTMLElement | null>(null);
  const [rows, setRows] = useState(ATTENTION_ROWS);

  useEffect(() => {
    if (!column || !beside || typeof ResizeObserver === "undefined") return;
    const sideBySide = window.matchMedia?.("(min-width: 64rem)");
    const fit = () => {
      if (!sideBySide?.matches) return setRows(ATTENTION_ROWS);
      const shown = [...column.querySelectorAll(`[${QUEUE_ROW}]`)];
      if (shown.length === 0) return;
      // By the tallest row, so a taller one coming in can't push the column past the other and back
      const rowHeight = Math.max(...shown.map((row) => row.getBoundingClientRect().height));
      const spare = beside.getBoundingClientRect().height - column.getBoundingClientRect().height;
      setRows(Math.min(ATTENTION_MOST, Math.max(FEWEST, shown.length + Math.floor(spare / rowHeight))));
    };
    // The observer measures once on its own when it starts
    const observer = new ResizeObserver(fit);
    observer.observe(column);
    observer.observe(beside);
    sideBySide?.addEventListener?.("change", fit);
    return () => {
      observer.disconnect();
      sideBySide?.removeEventListener?.("change", fit);
    };
  }, [column, beside]);

  return { columnRef: setColumn, besideRef: setBeside, rows };
}
