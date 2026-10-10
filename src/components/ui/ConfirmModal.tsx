import type { ReactNode } from "react";
import Button from "./Button";

interface ConfirmModalProps {
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

// "Are you sure?" dialog: a bottom drawer on phones, a centered card on larger screens.
// While the action runs, both buttons are locked and the dialog cannot be dismissed.
export default function ConfirmModal({
  open,
  title,
  children,
  confirmLabel,
  loadingLabel,
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  if (!open) return null;

  const close = () => {
    if (!loading) onClose();
  };

  return (
    <div
      className="drawer-backdrop fixed inset-0 z-50 flex items-end justify-center bg-gray-red/40 px-4 backdrop-blur-sm max-sm:p-0 sm:items-center"
      onClick={close}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="drawer-panel flex w-full max-w-md flex-col gap-4 rounded-sm border border-crimson bg-light-orange p-4 text-gray-red shadow-xl max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-b-none max-sm:rounded-t-md md:gap-8 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="confirm-modal-title" className="text-center font-display text-2xl text-gray-red">
          {title}
        </h3>

        <div className="text-center text-sm leading-relaxed text-gray-red/90 md:text-base">{children}</div>

        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="secondary" onClick={close} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} loading={loading} loadingText={loadingLabel}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
