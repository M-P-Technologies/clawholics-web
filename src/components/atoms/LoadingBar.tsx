import Blush from "./Blush";
import { TyingBow } from "./TyingBow";

interface LoadingBarProps {
  /** What is loading, shown under the bow and read out to screen readers. */
  label?: string;
  hint?: string;
  /** Sits in the flow of its parent (e.g. inside a modal) instead of covering the screen. */
  inline?: boolean;
}

const message = (label: string, hint?: string) => (
  <>
    <p className="copy-note">{label}…</p>
    {hint && <p className="max-w-xs text-center text-sm text-gray-red">{hint}</p>}
  </>
);

// By default a whole empty screen: it covers the nav and footer too, with only the bow and two
// soft blushes in the corners on the page colour. Toasts (z-200) still show above it.
export const LoadingBar = ({ label = "Loading", hint, inline = false }: LoadingBarProps) => {
  if (inline) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3">
        <TyingBow className="h-16 w-14 text-crimson" />
        {message(label, hint)}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 overflow-hidden bg-light-orange"
    >
      <Blush className="-left-24 top-8 h-72 w-72 sm:h-96 sm:w-96" />
      <Blush tone="crimson" className="-right-20 bottom-4 h-72 w-72 sm:h-96 sm:w-96" />

      <TyingBow className="h-16 w-14 text-crimson" />
      {message(label, hint)}
    </div>
  );
};
