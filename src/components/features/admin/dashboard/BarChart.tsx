
import { useEffect, useRef, useState } from "react";

interface BarChartProps {
  title: string;
  data: { label: string; a: number; b: number }[];
  aLabel: string;
  bLabel: string;
  aColor: string;
  bColor: string;
  emptyText: string;
}

const W = 300;
// The least the drawing is tall; in a taller card it grows to fill it (see useDrawingHeight)
const MIN_H = 156;
const LEFT = 26;
const TOP = 8;
const BOTTOM = 22;

// Up to about four evenly spaced gridlines, at round numbers (1, 2 or 5 times a power of ten),
// from 0 to the first one at or above `max`
function niceTicks(max: number): number[] {
  const raw = max / 3;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? 10 * magnitude);
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

// The drawing is always W units wide, so its height in the same units follows the shape of the
// box it is in: a card stretched by its neighbour gets taller bars, not empty space under them.
function useDrawingHeight() {
  const boxRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(MIN_H);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const { width, height: boxHeight } = box.getBoundingClientRect();
      if (width > 0) setHeight(Math.max(MIN_H, Math.round((W * boxHeight) / width)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return { boxRef, height };
}

// Grouped columns, one pair per entry: `a` and `b` side by side, each from the baseline and
// scaled on its own value, with rounded ends. Labelled gridlines run behind them.
export default function BarChart({ title, data, aLabel, bLabel, aColor, bColor, emptyText }: BarChartProps) {
  const { boxRef, height: H } = useDrawingHeight();
  const max = Math.max(...data.map((d) => Math.max(d.a, d.b)), 0);
  if (max === 0) return <p className="text-sm text-gray-red">{emptyText}</p>;

  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const innerW = W - LEFT;
  const innerH = H - TOP - BOTTOM;
  const slot = innerW / data.length;
  const GAP = 3;
  const barW = Math.min(12, (slot * 0.6 - GAP) / 2);
  const base = TOP + innerH;
  const y = (value: number) => base - (value / top) * innerH;
  const summary = `${title}: ${data.map((d) => `${d.label} ${d.a} ${aLabel.toLowerCase()}, ${d.b} ${bLabel.toLowerCase()}`).join("; ")}`;

  const bar = (series: "a" | "b", value: number, x: number, color: string) => {
    if (value <= 0) return null;
    const height = base - y(value);
    return <rect data-series={series} x={x} y={y(value)} width={barW} height={height} rx={Math.min(barW / 2, height / 2)} fill={color} />;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-gray-red">
        {[[aLabel, aColor], [bLabel, bColor]].map(([label, color]) => (
          <li key={label} className="flex items-center gap-3">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </li>
        ))}
      </ul>

      {/* The spacer keeps the least height; the drawing fills whatever the box ends up being */}
      <div ref={boxRef} className="relative min-h-0 flex-1">
        <div aria-hidden="true" className="w-full" style={{ aspectRatio: `${W} / ${MIN_H}` }} />
      <svg role="img" aria-label={summary} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full">
        {ticks.map((tick) => (
          <g key={tick}>
            <text data-tick x={LEFT - 4} y={y(tick) + 3} textAnchor="end" fontSize="9" fill="#7a5f5a">{tick}</text>
            {tick === 0 ? (
              <line x1={LEFT} x2={W} y1={base} y2={base} stroke="#f3b6c4" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <line x1={LEFT} x2={W} y1={y(tick)} y2={y(tick)} stroke="#f3b6c4" strokeDasharray="2 5" strokeLinecap="round" />
            )}
          </g>
        ))}
        {data.map((d, i) => {
          const center = LEFT + slot * i + slot / 2;
          const ax = center - GAP / 2 - barW;
          const bx = center + GAP / 2;
          return (
            <g key={d.label}>
              <title>{`${d.label}: ${d.a} ${aLabel.toLowerCase()}, ${d.b} ${bLabel.toLowerCase()}`}</title>
              {/* a wider, invisible target so the whole month shows its tooltip */}
              <rect x={LEFT + slot * i} y={TOP} width={slot} height={innerH} fill="transparent" />
              {bar("a", d.a, ax, aColor)}
              {bar("b", d.b, bx, bColor)}
              <text x={center} y={H - 6} textAnchor="middle" fontSize="9" fill="#7a5f5a">{d.label}</text>
            </g>
          );
        })}
      </svg>
      </div>

      <table aria-label={title} className="sr-only">
        <thead><tr><th>Month</th><th>{aLabel}</th><th>{bLabel}</th></tr></thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}><td>{d.label}</td><td>{d.a}</td><td>{d.b}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
