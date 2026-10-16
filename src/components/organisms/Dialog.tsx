"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import clsx from "clsx";
import { Button } from "../atoms";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// xl: a two-column form (the admin's create-appointment form)
const SIZE = { sm: "lg:max-w-sm", md: "lg:max-w-md", lg: "lg:max-w-lg", xl: "lg:max-w-175", "2xl": "lg:max-w-3xl" } as const;

// Open dialogs, oldest first: only the last one answers Escape, and the page's scroll is
// locked once for all of them and given back when the last one closes.
const openStack: object[] = [];
let savedOverflow = "";

function lockScroll() {
  if (openStack.length === 0) savedOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
}

function unlockScroll() {
  if (openStack.length === 0) document.body.style.overflow = savedOverflow;
}

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** Names the dialog; shown as its heading unless `header` replaces it */
  title: string;
  /** sheet: from the bottom on phones, centred from `lg` · center: centred everywhere · drawer: from the right */
  placement?: "sheet" | "center" | "drawer";
  size?: keyof typeof SIZE;
  role?: "dialog" | "alertdialog";
  /** false: Escape and the backdrop don't close it (e.g. while its action runs) */
  dismissible?: boolean;
  hideClose?: boolean;
  /** Replaces the heading row. Mark the element that should get focus first with `data-autofocus`. */
  header?: ReactNode;
  /** Kept at the bottom, outside the part that scrolls (e.g. the sheet's main action) */
  footer?: ReactNode;
  children: ReactNode;
}

// Every pop-up of the site: focus moves in and stays in, Escape closes, the page behind can't scroll,
// and focus goes back to what opened it.
export default function Dialog({ open, onClose, title, placement = "sheet", size = "lg", role = "dialog", dismissible = true, hideClose = false, header, footer, children }: DialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  const [token] = useState(() => ({}));
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE))?.focus();
    lockScroll();
    openStack.push(token);
    return () => {
      openStack.splice(openStack.indexOf(token), 1);
      unlockScroll();
      opener?.focus?.();
    };
  }, [open, token]);

  useEffect(() => {
    if (!open || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openStack[openStack.length - 1] === token) closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismissible, token]);

  const keepFocusInside = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab") return;
    const items = [...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;
  const drawer = placement === "drawer";
  const defaultHeader = (
    <div className="flex items-center justify-between gap-3 border-b border-crimson-light/50 pb-3">
      <h2 className="font-display text-xl font-normal normal-case tracking-normal text-gray-red">{title}</h2>
      {!hideClose && (
        <Button variant="bare" type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded-full p-1.5 text-gray-red hover:bg-crimson-light/40 hover:text-gray-red">
          <X size={20} aria-hidden="true" />
        </Button>
      )}
    </div>
  );

  return (
    <div
      className={clsx(
        "drawer-backdrop fixed inset-0 z-60 flex bg-gray-red/40 backdrop-blur-sm",
        drawer ? "justify-end" : placement === "center" ? "items-center justify-center px-3" : "items-end justify-center lg:items-center lg:px-9",
      )}
      onClick={() => dismissible && onClose()}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-label={title}
        onKeyDown={keepFocusInside}
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          "flex flex-col bg-milk text-gray-red shadow-2xl shadow-crimson/20",
          drawer
            ? "drawer-right h-full w-full max-w-120"
            : clsx(
                // Only the body scrolls: the heading (and a footer) stay put, and the scrollbar stays
                // inside the sheet instead of running down its rounded edge
                "drawer-panel max-h-[90vh] w-full overflow-hidden border border-crimson-light/40",
                placement === "center" ? "max-w-md rounded-2xl" : clsx("rounded-t-3xl lg:rounded-2xl", SIZE[size]),
              ),
        )}
      >
        {drawer ? (
          <>
            {header ?? defaultHeader}
            {children}
            {footer}
          </>
        ) : (
          <>
            <div className="shrink-0 px-6 pt-6">{header ?? defaultHeader}</div>
            <div className={clsx("flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 pt-3", footer ? "pb-3" : "pb-6")}>{children}</div>
            {footer && <div className="shrink-0 border-t border-crimson-light/50 px-6 py-3">{footer}</div>}
          </>
        )}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** What will happen, in plain words. Say if it cannot be undone. */
  children: ReactNode;
  confirmLabel: string;
  /** Shown on the confirm button while the action runs, for example "Deleting..." */
  loadingLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// "Are you sure?" While the action runs, both buttons are locked and it can't be dismissed.
export function ConfirmDialog({ open, title, children, confirmLabel, loadingLabel, cancelLabel = "Cancel", loading = false, onConfirm, onClose }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} role="alertdialog" size="md" dismissible={!loading} hideClose>
      <div className="text-left text-sm leading-relaxed text-gray-red md:text-base">{children}</div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button variant="secondary" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
        <Button onClick={onConfirm} loading={loading} loadingText={loadingLabel}>{confirmLabel}</Button>
      </div>
    </Dialog>
  );
}

interface AlertDialogProps {
  open: boolean;
  title: string;
  message: string;
  buttonText?: string;
  hideCloseButton?: boolean;
  onClose: () => void;
  onAction?: () => void;
}

// A message that needs reading, with Close and an optional action
export function AlertDialog({ open, title, message, buttonText = "OK", hideCloseButton = false, onClose, onAction }: AlertDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} role="alertdialog" size="md" dismissible={!hideCloseButton} hideClose>
      <p className="text-left leading-relaxed text-gray-red">{message}</p>
      <div className="flex justify-end gap-3">
        {!hideCloseButton && <Button variant="secondary" onClick={onClose}>Close</Button>}
        {onAction && <Button onClick={onAction}>{buttonText}</Button>}
      </div>
    </Dialog>
  );
}

interface FeedbackDialogProps {
  open: boolean;
  title: string;
  message: string;
  isError: boolean;
  onClose: () => void;
}

// Says how an action ended (done, or what went wrong), with one button to go on
export function FeedbackDialog({ open, title, message, isError, onClose }: FeedbackDialogProps) {
  const Icon = isError ? X : Check;
  return (
    <Dialog open={open} onClose={onClose} title={title} size="sm" hideClose header={<span className="sr-only">{title}</span>}>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className={clsx("flex h-16 w-16 items-center justify-center rounded-full", isError ? "bg-danger/10" : "bg-crimson/10")}>
          <Icon aria-hidden="true" className="h-8 w-8 text-gray-red" />
        </span>
        <p className="font-display text-2xl text-crimson-ink">{title}</p>
        <p className="text-sm leading-relaxed text-gray-red md:text-base">{message}</p>
        <Button onClick={onClose}>Continue</Button>
      </div>
    </Dialog>
  );
}
