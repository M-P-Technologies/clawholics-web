"use client";

import type { KeyboardEvent } from "react";
import clsx from "clsx";

interface TabsProps<T extends string> {
  label: string;
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  /** Makes the tab and panel ids: `${idPrefix}-tab-${value}` and `${idPrefix}-panel-${value}` */
  idPrefix: string;
}

// The admin's underlined tab row. Left and Right move between tabs (and select them).
export default function Tabs<T extends string>({ label, tabs, value, onChange, idPrefix }: TabsProps<T>) {
  const move = (e: KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = tabs[(index + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
    onChange(next.value);
    document.getElementById(`${idPrefix}-tab-${next.value}`)?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex shrink-0 overflow-x-auto overflow-y-hidden border-b border-crimson-light/50 px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab, index) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => move(e, index)}
            className={clsx(
              "shrink-0 whitespace-nowrap border-b-2 px-4 py-3.5 text-[14px] font-bold transition-colors",
              selected ? "border-crimson text-berry" : "border-transparent text-gray-red/70 hover:text-berry",
            )}
          >
            {tab.label}
            {tab.count !== undefined && <span className="ml-1.5 rounded-full bg-crimson-light/50 px-1.5 text-[11px] text-berry">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
