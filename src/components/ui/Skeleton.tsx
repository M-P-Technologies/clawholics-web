import clsx from "clsx";

// A soft placeholder where content will appear while it loads: size and shape it with
// `className` (e.g. "h-4 w-24", or "h-9 w-9 rounded-full" for a photo). It pulses unless the
// visitor asks for less motion. Screen readers skip it, so label the area it fills instead
// (role="status" with a "Loading …" line).
export default function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" data-testid="skeleton" className={clsx("block rounded-md bg-crimson-light/40 motion-safe:animate-pulse", className)} />;
}
