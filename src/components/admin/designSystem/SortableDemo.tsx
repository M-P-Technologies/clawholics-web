"use client";

import { useState } from "react";
import { DragHandle, SortableList } from "../../molecules";

// Three rows that can be dragged into a new order.
export default function SortableDemo() {
  const [items, setItems] = useState([
    { id: 1, label: "First" },
    { id: 2, label: "Second" },
    { id: 3, label: "Third" },
  ]);
  return (
    <div className="max-w-xs">
      <SortableList
        items={items}
        getItemId={(item) => item.id}
        onReorder={setItems}
        renderItem={(item, { dragHandleProps }) => (
          <div className="flex items-center gap-2 rounded-lg border border-sand bg-white px-3 py-2">
            <DragHandle {...dragHandleProps} />
            <span className="text-sm text-berry">{item.label}</span>
          </div>
        )}
      />
    </div>
  );
}
