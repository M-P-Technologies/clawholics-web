import type { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/molecules";

interface DirectoryStat {
  label: string;
  /** null while it loads or when it couldn't be worked out: the card shows a dash */
  value: number | null;
  hint: string;
  icon: LucideIcon;
  /** Still loading: the card shows a placeholder instead of the dash */
  loading?: boolean;
}

// The four totals above a directory, drawn like the dashboard's stat cards
export default function DirectoryStats({ label, stats }: { label: string; stats: DirectoryStat[] }) {
  return (
    <section aria-label={label} className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value === null ? "–" : String(stat.value)} hint={stat.hint} icon={stat.icon} loading={stat.loading} />
      ))}
    </section>
  );
}
