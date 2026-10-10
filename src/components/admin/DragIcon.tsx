import { GripVertical as DragSvg } from "lucide-react";
import type { SortableHandleProps } from "./SortableList";
import Button from "../ui/Button";

const DragIcon = ({
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
      aria-label="Drag section"
    >
      <DragSvg size={20} className="text-gray-red" />
    </Button>
  );
};

export default DragIcon;