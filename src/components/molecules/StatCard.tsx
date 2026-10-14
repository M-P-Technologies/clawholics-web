import { ArrowDownRight, ArrowUpRight, Minus, Sparkles, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import clsx from "clsx";
import type { ChangeView } from "../../lib/dashboardFormat";

interface StatCardProps {
  label: string;
  value: string;
  /** How it moved against the previous period; leave out for a tile with no comparison */
  change?: ChangeView | null;
  hint?: string;
  /** For measures where a rise is bad (cancellations) */
  lowerIsBetter?: boolean;
  /** `hero` is the larger card the money figures use; `compact` is the small tinted box */
  size?: "compact" | "normal" | "hero";
  /** `bare` drops the card, for tiles that sit inside a card of their own */
  variant?: "card" | "bare";
  /** A decorative badge in the top-right corner */
  icon?: LucideIcon;
  /** A small line along the bottom of the card, e.g. a Sparkline */
  sparkline?: ReactNode;
  className?: string;
}

const WORDS = {
  up: "up, compared with the previous period",
  down: "down, compared with the previous period",
  flat: "unchanged, compared with the previous period",
  new: "new, compared with the previous period",
  none: "no comparison available",
} as const;

// A headline number. The change is a soft pill with an arrow, a figure and (for screen readers)
// words, so it never relies on color alone.
export default function StatCard({
  label, value, change, hint, lowerIsBetter = false, size = "normal", variant = "card", icon: CardIcon, sparkline, className,
}: StatCardProps) {
  const Icon = change?.kind === "up" ? ArrowUpRight : change?.kind === "down" ? ArrowDownRight : change?.kind === "new" ? Sparkles : Minus;
  const good = change?.kind === "up" || change?.kind === "new" ? !lowerIsBetter : change?.kind === "down" ? lowerIsBetter : null;

  if (size === "compact") {
    return (
      <div role="group" aria-label={label} className={clsx("flex min-w-0 flex-col gap-1 rounded-xl bg-crimson-light/15 p-3", className)}>
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-gray-red/80">
          {CardIcon && <CardIcon size={14} aria-hidden="true" className="text-berry" />}
          {label}
        </span>
        <span className="truncate font-display text-2xl leading-tight text-berry">{value}</span>
        {hint && <span className="text-[11px] text-gray-red/60">{hint}</span>}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={label}
      className={clsx(
        "relative flex min-w-0 flex-col gap-2",
        variant === "card" && "rounded-2xl border border-crimson-light/40 bg-milk p-4 shadow-petal sm:p-5",
        variant === "card" && size === "hero" && "bg-gradient-to-br from-milk via-milk to-crimson-light/30",
        className,
      )}
    >
      {CardIcon && (
        <span
          data-testid="kpi-icon"
          aria-hidden="true"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-crimson-light/40 text-berry sm:right-4 sm:top-4 sm:h-10 sm:w-10 lg:h-8 lg:w-8 xl:h-10 xl:w-10"
        >
          <CardIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-4 lg:w-4 xl:h-5 xl:w-5" strokeWidth={1.75} />
        </span>
      )}
      <p className={clsx("text-[13px] font-medium text-gray-red/80", CardIcon && "pr-10")}>{label}</p>
      <p
        className={clsx(
          "break-words font-display leading-none text-berry",
          size === "hero" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl lg:text-3xl xl:text-4xl",
        )}
      >
        {value}
      </p>
      {change && (
        <p
          className={clsx(
            "inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-bold text-gray-red",
            good === true && "bg-success/20",
            good === false && "bg-danger/15",
            good === null && "bg-sand",
          )}
        >
          <Icon size={14} aria-hidden="true" className="shrink-0" />
          <span>{change.label}</span>
          <span className="sr-only">{WORDS[change.kind]}</span>
        </p>
      )}
      {hint && <p className="text-[12px] leading-snug text-gray-red/70">{hint}</p>}
      {sparkline && <div className="mt-auto pt-2">{sparkline}</div>}
    </div>
  );
}
