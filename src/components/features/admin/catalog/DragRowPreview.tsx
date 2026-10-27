import { ChevronDown, GripVertical } from "lucide-react";

// What follows the pointer while a service or an artist row is dragged: just its name, drawn like
// the collapsed row (the real row stays in the list as a gap, and isn't built a second time)
export default function DragRowPreview({ title }: { title: string }) {
  return (
    <div className="flex min-h-8.75 w-full scale-[1.02] items-center gap-3 rounded-xl border border-crimson-light/50 bg-milk px-3 py-3 shadow-2xl">
      <GripVertical size={18} aria-hidden="true" className="shrink-0 text-gray-red" />
      <span className="block min-w-0 flex-1 truncate text-base font-bold text-gray-red">{title}</span>
      <ChevronDown size={22} aria-hidden="true" className="shrink-0 text-gray-red" />
    </div>
  );
}
