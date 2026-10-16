import { useEffect, useRef, useState } from "react";

/** A row's height and the header's, until they're measured */
const ROW_GUESS = 73;
const HEAD_GUESS = 30;

// A paged table that shows as many rows as fit in the room its card gives it, and never fewer than
// `min`. Put `ref` and `style` on a box that takes the card's free room (e.g. `relative min-h-0
// flex-1`) and place the table inside it (`absolute inset-0`), so the rows shown never size the box:
// the count then follows the box both ways as the window or the panel beside it changes. The
// table's header and first row are measured each time the box changes size. Without
// ResizeObserver (tests) it stays at `min`.
export function useFitRows(min: number, active = true) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ rows: min, minHeight: HEAD_GUESS + ROW_GUESS * min });

  useEffect(() => {
    const box = ref.current;
    if (!active || !box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const head = box.querySelector("thead")?.getBoundingClientRect().height || HEAD_GUESS;
      const row = box.querySelector("tbody tr")?.getBoundingClientRect().height || ROW_GUESS;
      const rows = Math.max(min, Math.floor((box.clientHeight - head) / row));
      const minHeight = Math.ceil(head + row * min);
      setFit((now) => (now.rows === rows && now.minHeight === minHeight ? now : { rows, minHeight }));
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [min, active]);

  return { ref, rows: active ? fit.rows : min, style: { minHeight: fit.minHeight } };
}
