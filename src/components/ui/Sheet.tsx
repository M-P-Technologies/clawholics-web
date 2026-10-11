import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import Button from "./Button";

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// A panel that rises from the bottom on phones and is a centred dialog from `lg` up.
export default function Sheet({ open, title, onClose, children }: SheetProps) {
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
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="drawer-panel flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-md border border-crimson-light bg-light-orange p-4 shadow-2xl shadow-crimson/20 md:p-8 lg:max-w-lg lg:rounded-sm"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="label-caps">{title}</h2>
          <Button variant="bare" type="button" aria-label="Close" onClick={onClose} className="shrink-0 p-1 text-gray-red hover:text-crimson">
            <X size={20} aria-hidden="true" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
