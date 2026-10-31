import type { ReactNode } from "react";
import clsx from "clsx";

interface SummaryRowProps {
  label: string;
  value: ReactNode;
  /** A small icon before the label, e.g. <Clock size={16} /> */
  icon?: ReactNode;
  /** The total: bigger and in the brand colour */
  strong?: boolean;
  className?: string;
}

// One label and value line in a summary list (a booking, a payment, an appointment's details), divided
// from the row above by a dotted line. Goes inside a <dl>. A long value wraps.
export default function SummaryRow({ label, value, icon, strong = false, className }: SummaryRowProps) {
  return (
    <div className={clsx("flex items-baseline justify-between gap-3 border-t border-dotted border-crimson-light py-2 first:border-t-0 first:pt-0", className)}>
      <dt className="flex shrink-0 items-center gap-3 text-[13px] text-gray-red">
        {icon && (
          <span aria-hidden="true" className="shrink-0 text-crimson">
            {icon}
          </span>
        )}
        {label}
      </dt>
      <dd
        className={clsx(
          "min-w-0 wrap-break-word text-right",
          strong ? "font-display text-xl text-berry" : "text-[13px] font-bold text-gray-red",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
