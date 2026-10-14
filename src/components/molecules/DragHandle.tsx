"use client";

import { GripVertical as DragSvg } from "lucide-react";
import type { SortableHandleProps } from "./SortableList";
import { Button } from "@/components/atoms";

const DragHandle = ({
  listeners,
  attributes,
  setActivatorNodeRef,
}: SortableHandleProps) => {
  return (
    <Button
      variant="bare"
      type="button"
      ref={setActivatorNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => e.stopPropagation()}
      className="cursor-grab active:cursor-grabbing flex items-center shrink-0"
      aria-label="Drag to reorder"
    >
      <DragSvg size={18} className="text-gray-red/70" />
    </Button>
  );
};

export default DragHandle;