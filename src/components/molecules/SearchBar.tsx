"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  /** With it, the bar is a search form with a submit button */
  onSubmit?: () => void;
  label?: string;
  placeholder?: string;
  /** A control at the end, e.g. a filter button */
  trailing?: ReactNode;
  /** "raised": the client app's white box with a shadow. "outline": the admin's slim pill (a
   *  light-pink border, the icon at the end), for a search that sits on a card; filters as you
   *  type, so it takes no onSubmit or trailing control */
  look?: "raised" | "outline";
}

// The rounded search box of the client app: an icon, the input, and a submit or extra control
export default function SearchBar({ value, onChange, onSubmit, label = "Search services", placeholder = "Search services…", trailing, look = "raised" }: SearchBarProps) {
  if (look === "outline") {
    return (
      <label className="relative block w-full">
        <span className="sr-only">{label}</span>
        <input
          type="search"
          aria-label={label}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-full border border-crimson-light bg-milk pl-3 pr-9 text-[13px] text-gray-red outline-none placeholder:text-gray-red/60 focus:ring-2 focus:ring-crimson"
        />
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-red" />
      </label>
    );
  }

  const body = (
    <>
      {!onSubmit && <Search size={18} aria-hidden="true" className="shrink-0 text-gray-red" />}
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-gray-red outline-none placeholder:text-gray-red/50"
      />
      {onSubmit && (
        <button type="submit" aria-label="Search" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crimson text-light-orange">
          <Search size={18} aria-hidden="true" />
        </button>
      )}
      {trailing}
    </>
  );
  const box = "flex items-center gap-3 rounded-2xl bg-milk p-1.5 pl-3 shadow-petal";
  if (!onSubmit) return <div className={box}>{body}</div>;
  return (
    <form
      role="search"
      className={box}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {body}
    </form>
  );
}
