import type { ReactNode } from "react";

/**
 * The action row of a step-by-step screen. On phones it is pinned to the bottom of the screen while the page
 * scrolls under it, with the buttons on the right (a single button fills the width); from `sm` it sits in the flow.
 */
export default function StickyActionBar({ children, card = false }: { children: ReactNode; /** On phones a rounded card like the page's other cards, not an edge-to-edge band */ card?: boolean }) {
  return (
    <div className={card ? "sticky bottom-0 z-30 flex items-center justify-end gap-3 rounded-2xl bg-milk p-3 shadow-petal sm:static sm:bg-transparent sm:p-0 sm:shadow-none" : "sticky bottom-0 z-30 -mx-3 flex items-center justify-end gap-3 border-t border-crimson-light/40 bg-milk/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_20px_-10px] shadow-crimson/25 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none"}>
      {children}
    </div>
  );
}
