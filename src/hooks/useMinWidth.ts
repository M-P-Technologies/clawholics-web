import { useSyncExternalStore } from "react";

// True while the window is at least `width` wide (a CSS length, e.g. "48rem" for Tailwind's `md`).
// On the server, before hydration, and without matchMedia (tests) it is true: the wide layout.
function useMinWidth(width: string) {
  const query = `(min-width: ${width})`;
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener?.("change", onChange);
      return () => list?.removeEventListener?.("change", onChange);
    },
    () => window.matchMedia?.(query)?.matches ?? true,
    () => true,
  );
}

/** From Tailwind's `md` up the admin's tables show as tables; below it, as cards */
export const useTableLayout = () => useMinWidth("48rem");
