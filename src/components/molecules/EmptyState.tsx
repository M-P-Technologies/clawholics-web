import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Inbox, Info } from "lucide-react";
import clsx from "clsx";
import { Button } from "../atoms";

type StateKind = "error" | "empty" | "success" | "info";

interface EmptyStateProps {
  kind: StateKind;
  /** What happened, in a few words */
  title: string;
  /** What it means for the person and what they can do next */
  message?: string;
  /** Buttons or links */
  children?: ReactNode;
  className?: string;
}

const ICONS = {
  error: AlertCircle,
  empty: Inbox,
  success: CheckCircle2,
  info: Info,
};

// Each icon sits in a soft circle of its own colour, like the cards' icons
const ICON_COLORS = {
  error: "bg-danger/10 text-danger-ink",
  empty: "bg-crimson-light/40 text-berry",
  success: "bg-success/15 text-success-ink",
  info: "bg-crimson-light/40 text-berry",
};

// One look for every "nothing to show" moment: it failed, it is empty, it worked, or FYI. Drawn
// like the brand's cards: milk white, a soft pink border and the petal shadow.
// Errors are announced right away (role="alert"); the others politely (role="status").
export default function EmptyState({ kind, title, message, children, className }: EmptyStateProps) {
  const Icon = ICONS[kind];

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={clsx(
        "mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-6 text-center shadow-petal sm:p-9",
        className,
      )}
    >
      <span aria-hidden="true" className={clsx("flex h-14 w-14 items-center justify-center rounded-full", ICON_COLORS[kind])}>
        <Icon size={28} strokeWidth={1.75} />
      </span>
      <h2 className="font-display text-2xl font-normal text-gray-red md:text-3xl">
        {title}
      </h2>
      {message && <p className="copy-body">{message}</p>}
      {children && <div className="flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  );
}

/** Shown in place of a whole page when its content could not be loaded */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-3 py-12">
      <EmptyState
        kind="error"
        title={`We couldn't load the ${what}`}
        message="This is usually a weak or lost connection, or our server is busy for a moment. Nothing you did caused this, and nothing was lost. Please try again."
      >
        <Button type="button" onClick={onRetry}>Try again</Button>
        <Button variant="secondary" to="/">Back to home</Button>
      </EmptyState>
    </div>
  );
}
