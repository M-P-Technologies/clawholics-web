import type { LucideIcon } from "lucide-react";

// A small count or date with its icon, in a soft tinted box
export default function StatCard({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-col gap-1 rounded-xl bg-crimson-light/15 p-3">
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-gray-red/80">
        <Icon size={14} aria-hidden="true" className="text-berry" />
        {label}
      </span>
      <span className="truncate font-display text-2xl leading-tight text-berry">{value}</span>
      {hint && <span className="text-[11px] text-gray-red/60">{hint}</span>}
    </div>
  );
}
