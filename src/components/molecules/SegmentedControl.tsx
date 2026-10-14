"use client";

import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

interface SegmentedControlProps<T extends string> {
  label: string;
  options: { value: T; label: string; count?: number; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

// The admin's pill switch: a few choices in a soft pill, the chosen one raised. Left and Right move.
export default function SegmentedControl<T extends string>({ label, options, value, onChange, className }: SegmentedControlProps<T>) {
  const move = (e: KeyboardEvent, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    onChange(options[(index + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length].value);
  };
  return (
    <div role="tablist" aria-label={label} className={clsx("flex gap-1 rounded-full bg-crimson-light/25 p-1", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => move(e, index)}
            className={clsx(
              "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors",
              selected ? "bg-milk text-berry shadow-sm" : "text-gray-red/80 hover:text-berry",
            )}
          >
            {Icon && <Icon size={14} aria-hidden="true" />}
            {option.label}
            {option.count !== undefined && <span className="rounded-full bg-crimson-light/50 px-1.5 text-[11px] text-berry">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
