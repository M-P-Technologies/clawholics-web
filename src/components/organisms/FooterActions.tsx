import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/** The class of the footer row a Dialog's `footer` holds the buttons in: right-aligned, wrapping */
export const FOOTER_ACTIONS_CLASS = "flex flex-wrap items-center justify-end gap-3";

interface FooterActionsProps {
  /** The footer row's element (a Dialog's `footer` with `ref={setHost}`). `undefined` draws the
   *  buttons where they are, for a form used on a page; `null` is a footer not mounted yet. */
  host: HTMLElement | null | undefined;
  children: ReactNode;
}

// A form that owns its state but whose buttons belong in its Dialog's sticky footer: the buttons
// stay in the form's React tree (so they keep its state and submit it with the `form` attribute)
// and are drawn inside the footer.
export default function FooterActions({ host, children }: FooterActionsProps) {
  if (host === undefined) return <div className={FOOTER_ACTIONS_CLASS}>{children}</div>;
  return host ? createPortal(children, host) : null;
}
