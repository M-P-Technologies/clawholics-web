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

const ICON_COLORS = {
  error: "text-danger",
  empty: "text-crimson",
  success: "text-success",
  info: "text-crimson",
};

// One look for every "nothing to show" moment: it failed, it is empty, it worked, or FYI.
// Errors are announced right away (role="alert"); the others politely (role="status").
export default function EmptyState({ kind, title, message, children, className }: EmptyStateProps) {
  const Icon = ICONS[kind];

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={clsx(
        "mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-sm border border-crimson-light/80 bg-light-orange p-8 text-center",
        className,
      )}
    >
      <Icon size={40} strokeWidth={1.5} aria-hidden="true" className={ICON_COLORS[kind]} />
      <h2 className="font-display text-xl font-normal uppercase tracking-widest text-gray-red md:text-2xl">
        {title}
      </h2>
      {message && <p className="copy-body">{message}</p>}
      {children && <div className="flex flex-wrap items-center justify-center gap-4">{children}</div>}
    </div>
  );
}

/** Shown in place of a whole page when its content could not be loaded */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
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
