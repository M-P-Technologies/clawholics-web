"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { SearchBar } from "@/components/molecules";

// Both forms of SearchBar with their own text state.
export default function SearchDemo() {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  return (
    <div className="grid w-full max-w-md gap-3">
      <SearchBar value={a} onChange={setA} onSubmit={() => {}} />
      <SearchBar
        value={b}
        onChange={setB}
        trailing={
          <button type="button" aria-label="Filter by category" className="flex h-10 w-10 items-center justify-center rounded-xl bg-crimson text-milk">
            <SlidersHorizontal size={18} aria-hidden="true" />
          </button>
        }
      />
    </div>
  );
}
