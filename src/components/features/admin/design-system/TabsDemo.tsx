"use client";

import { useState } from "react";
import { Tabs } from "@/components/molecules";

type DemoTab = "overview" | "notes" | "visits";

// Tabs with a selected value and a count badge.
export default function TabsDemo() {
  const [tab, setTab] = useState<DemoTab>("overview");
  return (
    <div className="w-full max-w-md">
      <Tabs
        label="Demo sections"
        idPrefix="ds-tabs"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "notes", label: "Notes", count: 3 },
          { value: "visits", label: "Visits" },
        ]}
      />
    </div>
  );
}
