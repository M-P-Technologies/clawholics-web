import Bow from "../../assets/bow.svg";

// Full-screen loader. `label` says what is loading, and is read out to screen readers.
export const LoadingBar = ({ label = "Loading", hint }: { label?: string; hint?: string }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 flex flex-col items-center justify-center gap-4"
    >
      <Bow aria-hidden="true" focusable="false" className="h-10 w-10 text-crimson" />
      <div className="line-wobble" aria-hidden="true"></div>
      <p className="text-sm text-gray-red/80">{label}…</p>
      {hint && <p className="max-w-xs text-center text-sm text-gray-red/60">{hint}</p>}
    </div>
  );
};
