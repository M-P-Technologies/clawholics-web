import type { ReactNode } from "react";

interface SummaryRowProps {
  label: string;
  value: ReactNode;
  /** A small icon before the label, e.g. <Clock size={16} /> */
  icon?: ReactNode;
}

// One label and value line in a summary list (payment, booking, receipt).
export default function SummaryRow({ label, value, icon }: SummaryRowProps) {
  return (
    <div className="flex items-start justify-between gap-8 border-b border-crimson-light/80 py-4 text-gray-red">
      <dt className="label-caps flex items-center gap-2">
        {icon && (
          <span aria-hidden="true" className="shrink-0 text-crimson">
            {icon}
          </span>
        )}
        {label}
      </dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
