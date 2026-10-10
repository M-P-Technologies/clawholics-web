import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Inbox, Info } from "lucide-react";
import clsx from "clsx";

type StateKind = "error" | "empty" | "success" | "info";

interface StatePanelProps {
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
export default function StatePanel({ kind, title, message, children, className }: StatePanelProps) {
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
      {message && <p className="text-base leading-relaxed text-gray-red/80">{message}</p>}
      {children && <div className="flex flex-wrap items-center justify-center gap-4">{children}</div>}
    </div>
  );
}
