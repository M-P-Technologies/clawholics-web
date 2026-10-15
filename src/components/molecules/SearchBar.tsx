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
}

// The rounded search box of the client app: an icon, the input, and a submit or extra control
export default function SearchBar({ value, onChange, onSubmit, label = "Search services", placeholder = "Search services…", trailing }: SearchBarProps) {
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
        <button type="submit" aria-label="Search" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-crimson text-on-crimson">
          <Search size={18} aria-hidden="true" />
        </button>
      )}
      {trailing}
    </>
  );
  const box = "flex items-center gap-2 rounded-2xl bg-milk p-1.5 pl-3 shadow-petal";
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
