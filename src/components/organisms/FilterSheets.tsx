"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import clsx from "clsx";
import Dialog from "./Dialog";

export interface SheetFilter {
  key: string;
  /** Names the filter's button and the heading of its options */
  title: string;
  value: string;
  options: { value: string; label: string }[];
  pick: (value: string) => void;
}

// Filters on a phone: one row of buttons, each showing what is chosen and opening its options in a
// bottom drawer (as the admin's appointment list does), where a Select would open a long menu.
export default function FilterSheets({ filters, className }: { filters: SheetFilter[]; className?: string }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  return (
    <>
      <div className={clsx("grid w-full gap-3", className)} style={{ gridTemplateColumns: `repeat(${filters.length}, minmax(0, 1fr))` }}>
        {filters.map((filter) => {
          const chosen = filter.options.find((o) => o.value === filter.value)?.label;
          return (
            <button
              key={filter.key}
              type="button"
              aria-label={`${filter.title}: ${chosen}`}
              onClick={() => setOpenKey(filter.key)}
              className="flex h-9 min-w-0 items-center justify-between gap-1 rounded-md border border-crimson-light bg-milk px-3 text-sm text-gray-red focus-visible:outline-2 focus-visible:outline-crimson"
            >
              <span className="min-w-0 truncate">{chosen}</span>
              <ChevronDown size={14} aria-hidden="true" className="shrink-0 text-crimson" />
            </button>
          );
        })}
      </div>

      {filters.map((filter) => (
        <Dialog key={filter.key} open={openKey === filter.key} title={filter.title} onClose={() => setOpenKey(null)}>
          <ul role="listbox" aria-label={filter.title} className="flex flex-col gap-1">
            {filter.options.map((option) => {
              const chosen = option.value === filter.value;
              return (
                <li key={option.value} role="option" aria-selected={chosen}>
                  <button
                    type="button"
                    onClick={() => {
                      filter.pick(option.value);
                      setOpenKey(null);
                    }}
                    className={clsx(
                      "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors",
                      chosen ? "bg-crimson-light/40 font-bold text-berry" : "text-gray-red hover:bg-crimson-light/20",
                    )}
                  >
                    {option.label}
                    {chosen && <Check size={16} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog>
      ))}
    </>
  );
}
