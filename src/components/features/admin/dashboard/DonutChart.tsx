import { TRACK } from "@/components/features/admin/dashboard/chartColors";

interface DonutChartProps {
  title: string;
  slices: { label: string; value: number; color: string }[];
  centerLabel: string;
  emptyText: string;
}

const R = 38;
const CIRCUMFERENCE = 2 * Math.PI * R;

// A ring of up to six slices with the total in the middle. Every slice is also in the legend
// with its value and share, so nothing depends on color alone.
export default function DonutChart({ title, slices, centerLabel, emptyText }: DonutChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return <p className="text-sm text-gray-red/70">{emptyText}</p>;

  const gap = slices.filter((s) => s.value > 0).length > 1 ? 1.5 : 0;
  let offset = 0;
  const summary = `${title}: ${slices.map((s) => `${s.label} ${s.value}`).join(", ")}`;

  return (
    // The legend sits beside the ring only when the card itself has room (a container query):
    // in a narrow card it goes underneath, so the names and figures stay inside
    <div className="@container w-full">
      <div className="flex flex-col items-center gap-4 @md:flex-row">
        <div className="relative h-44 w-44 shrink-0">
          <svg role="img" aria-label={summary} viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke={TRACK} strokeWidth="14" />
            {slices.map((s) => {
              if (s.value === 0) return null;
              const length = (s.value / total) * CIRCUMFERENCE;
              const dash = Math.max(length - gap, 0);
              const node = (
                <circle
                  key={s.label}
                  cx="50" cy="50" r={R} fill="none" stroke={s.color} strokeWidth="14"
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`} strokeDashoffset={-offset}
                >
                  <title>{`${s.label}: ${s.value}`}</title>
                </circle>
              );
              offset += length;
              return node;
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-3xl text-berry">{total}</span>
            <span className="text-[12px] text-gray-red/70">{centerLabel}</span>
          </div>
        </div>

        <ul className="flex min-w-0 flex-1 flex-col gap-2 self-stretch text-sm text-gray-red">
          {slices.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="min-w-0 flex-1 truncate">{s.label}</span>
              <span className="shrink-0 text-gray-red/80">{`${s.value} (${Math.round((s.value / total) * 100)}%)`}</span>
            </li>
          ))}
        </ul>

        <table aria-label={title} className="sr-only">
          <thead><tr><th>Item</th><th>Count</th></tr></thead>
          <tbody>
            {slices.map((s) => (
              <tr key={s.label}><td>{s.label}</td><td>{s.value}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
