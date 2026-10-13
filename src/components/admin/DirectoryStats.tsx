import type { LucideIcon } from "lucide-react";
import KpiCard from "./dashboard/KpiCard";

export interface DirectoryStat {
  label: string;
  /** null while it loads or when it couldn't be worked out: the card shows a dash */
  value: number | null;
  hint: string;
  icon: LucideIcon;
}

// The four totals above a directory, drawn like the dashboard's stat cards
export default function DirectoryStats({ label, stats }: { label: string; stats: DirectoryStat[] }) {
  return (
    <section aria-label={label} className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
      {stats.map((stat) => (
        <KpiCard key={stat.label} label={stat.label} value={stat.value === null ? "–" : String(stat.value)} hint={stat.hint} icon={stat.icon} />
      ))}
    </section>
  );
}
