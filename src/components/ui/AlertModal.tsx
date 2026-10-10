import Button from "./Button";

interface AlertModalProps {
  open: boolean;
  title: string;
  message: string;
  buttonText?: string;
  hideCloseButton?: boolean;
  onClose: () => void;
  onAction?: () => void;
}

export default function AlertModal({
  open,
  title,
  message,
  buttonText = "OK",
  hideCloseButton = false,
  onClose,
  onAction,
}: AlertModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-999 flex items-end sm:items-center justify-center bg-gray-red/40 px-8 backdrop-blur-sm drawer-backdrop max-sm:p-0">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        className="flex w-full max-w-md flex-col gap-4 rounded-sm border border-crimson-light bg-light-orange p-4 shadow-2xl md:gap-8 md:p-8 shadow-crimson/20 drawer-panel max-sm:max-h-[90vh] max-sm:min-h-[40vh] max-sm:w-full max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none"
      >
        <h2
          id="alert-modal-title"
          className="font-display text-2xl font-normal not-italic uppercase tracking-widest text-gray-red"
        >
          {title}
        </h2>

        <p className="text-left leading-relaxed text-gray-red/80">{message}</p>

        <div className="flex justify-end gap-4">
          {!hideCloseButton && (
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          )}

          {onAction && (
            <Button onClick={onAction}>
              {buttonText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
