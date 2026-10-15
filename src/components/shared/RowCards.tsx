import type { ReactNode } from "react";
import clsx from "clsx";

/** How many cards a phone shows per page, in place of a table's rows */
export const CARDS_PER_PAGE = 5;

// A table's rows as cards, for phones: each row is a card with its heading on top and the other
// columns as label and value pairs below.
export function RowCards({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="flex flex-col gap-3">
      {children}
    </ul>
  );
}

export function RowCard({ children, selected = false, className }: { children: ReactNode; selected?: boolean; className?: string }) {
  return (
    <li
      className={clsx(
        "flex min-w-0 flex-col gap-3 rounded-xl border p-4 text-sm text-gray-red",
        selected ? "border-crimson bg-crimson-light/30" : "border-crimson-light/50 bg-light-orange/30",
        className,
      )}
    >
      {children}
    </li>
  );
}

/** The columns of a card, as label and value pairs */
export function CardFields({ fields }: { fields: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-[13px]">
      {fields.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-gray-red/70">{label}</dt>
          <dd className="min-w-0 break-words text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
