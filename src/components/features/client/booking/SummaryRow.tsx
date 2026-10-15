import type { ReactNode } from "react";
import clsx from "clsx";
import { field } from "@/components/tokens";

interface SummaryRowProps {
  label: string;
  value: ReactNode;
  /** A small icon before the label, e.g. <Clock size={16} /> */
  icon?: ReactNode;
}

// One label and value line in a summary list (payment, booking, receipt). A long value wraps.
export default function SummaryRow({ label, value, icon }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-crimson-light/40 py-3 text-gray-red last:border-b-0">
      <dt className={clsx(field.label, "flex shrink-0 items-center gap-2")}>
        {icon && (
          <span aria-hidden="true" className="shrink-0 text-crimson">
            {icon}
          </span>
        )}
        {label}
      </dt>
      <dd className="min-w-0 break-words text-right text-sm font-bold">{value}</dd>
    </div>
  );
}
