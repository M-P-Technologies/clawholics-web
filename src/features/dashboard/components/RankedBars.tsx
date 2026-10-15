import { BAR_COLOR, TRACK } from "./chartColors";

interface RankedBarsProps {
  title: string;
  rows: { label: string; value: number; valueLabel?: string; color?: string }[];
  emptyText: string;
}

// Horizontal bars sized against the largest value. The number is always written beside its
// bar, so the bar only has to show proportion.
export default function RankedBars({ title, rows, emptyText }: RankedBarsProps) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (max === 0) return <p className="text-sm text-gray-red/70">{emptyText}</p>;

  return (
    <ul aria-label={title} className="flex flex-col gap-3">
      {rows.map((row) => (
        <li key={row.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-4 text-sm text-gray-red">
            <span className="min-w-0 truncate">{row.label}</span>
            <span className="shrink-0 font-bold">{row.valueLabel ?? row.value}</span>
          </div>
          <div className="h-2.5 rounded-full" style={{ backgroundColor: TRACK }} aria-hidden="true">
            <div
              data-testid="ranked-bar"
              className="h-2.5 rounded-full"
              style={{ width: `${(row.value / max) * 100}%`, backgroundColor: row.color ?? BAR_COLOR }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
