import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/atoms";

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// A panel that rises from the bottom on phones and is a centred dialog from `lg` up.
export default function Sheet({ open, title, onClose, children }: SheetProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Focus moves into the panel when it opens and goes back to what opened it when it closes
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => opener?.focus?.();
  }, [open]);

  // Tab wraps around inside the panel
  const keepFocusInside = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab") return;
    const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
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

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="drawer-backdrop fixed inset-0 z-[60] flex items-end justify-center bg-gray-red/40 backdrop-blur-sm lg:items-center lg:px-8"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onKeyDown={keepFocusInside}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="drawer-panel flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-3xl border border-crimson-light/40 bg-milk p-5 shadow-2xl shadow-crimson/20 md:p-6 lg:max-w-lg lg:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-crimson-light/50 pb-3">
          <h2 className="font-display text-xl font-normal normal-case tracking-normal text-gray-red">{title}</h2>
          <Button variant="bare" type="button" aria-label="Close" onClick={onClose} className="shrink-0 rounded-full p-1.5 text-gray-red/70 hover:bg-crimson-light/40 hover:text-gray-red">
            <X size={20} aria-hidden="true" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
