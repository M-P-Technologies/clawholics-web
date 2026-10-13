import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// A card's heading, with its icon in a round badge like the dashboard's stat cards
export default function CardTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 font-display text-xl font-normal text-gray-red">
      <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-crimson-light/40 text-berry">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      {children}
    </h2>
  );
}
