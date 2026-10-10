import type { ReactNode } from "react";

// One label and value line in a summary list (payment, booking, receipt).
export default function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-8 border-b border-crimson-light/80 py-4 text-gray-red">
      <dt className="text-sm font-bold uppercase tracking-widest">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
