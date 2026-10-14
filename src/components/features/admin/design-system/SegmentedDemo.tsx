"use client";

import { useState } from "react";
import { Eye, PenLine } from "lucide-react";
import { SegmentedControl } from "@/components/molecules";

type View = "edit" | "preview";

// A pill switch with icons, and one with counts.
export default function SegmentedDemo() {
  const [view, setView] = useState<View>("edit");
  const [which, setWhich] = useState<"upcoming" | "past">("upcoming");
  return (
    <div className="flex flex-col items-start gap-3">
      <SegmentedControl
        label="Demo view"
        value={view}
        onChange={setView}
        options={[
          { value: "edit", label: "Edit", icon: PenLine },
          { value: "preview", label: "Preview", icon: Eye },
        ]}
      />
      <SegmentedControl
        label="Demo appointments"
        value={which}
        onChange={setWhich}
        options={[
          { value: "upcoming", label: "Upcoming", count: 2 },
          { value: "past", label: "Past", count: 5 },
        ]}
      />
    </div>
  );
}
