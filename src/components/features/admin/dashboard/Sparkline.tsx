import { useId } from "react";
import { BAR_COLOR } from "@/components/features/admin/dashboard/chartColors";

interface SparklineProps {
  values: number[];
  /** What each point says in a tooltip, e.g. "Oct 3: ₱500" */
  labels: string[];
  /** What the line shows, in words, for screen readers */
  ariaLabel: string;
}

// A small line under a stat card's number: no axes and no numbers, only the shape of the period.
// The line is drawn in a stretched 100x100 box (so it always fills the card's width) with a
// constant stroke width; the latest point is a pearl dot placed on top in plain HTML so it stays
// round. Values run from the lowest (bottom) to the highest (top), so a flat stretch of the data
// reads as flat and never as a crash to zero.
export default function Sparkline({ values, labels, ariaLabel }: SparklineProps) {
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (values.length === 0) return null;

  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const empty = max === 0;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => (max === min ? 50 : 90 - ((v - min) / (max - min)) * 80);
  const coords = values.map((v, i) => [x(i), y(v)] as const);
  const line = coords.map(([cx, cy], i) => `${i === 0 ? "M" : "L"}${cx.toFixed(2)},${cy.toFixed(2)}`).join(" ");
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <div className="relative h-10 w-full">
      <svg role="img" aria-label={ariaLabel} viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3b6c4" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#f3b6c4" stopOpacity="0" />
          </linearGradient>
        </defs>

        {empty ? (
          <line data-testid="spark-flat" x1="0" x2="100" y1="75" y2="75" stroke="#f3b6c4" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        ) : (
          n > 1 && (
            <>
              <path d={`${line} L100,100 L0,100 Z`} fill={`url(#${gradientId})`} stroke="none" />
              <path data-line="" d={line} fill="none" stroke={BAR_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </>
          )
        )}

        {/* One invisible column per point, so hovering anywhere along the line names that point */}
        {values.map((_, i) => (
          <rect key={i} x={n === 1 ? 0 : x(i) - 50 / (n - 1)} y="0" width={n === 1 ? 100 : 100 / (n - 1)} height="100" fill="transparent">
            <title>{labels[i]}</title>
          </rect>
        ))}
      </svg>

      {!empty && (
        <span
          data-testid="spark-dot"
          aria-hidden="true"
          className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-berry bg-pearl shadow-[0_1px_3px_rgb(184_58_98/0.4)]"
          style={{ left: `${lastX}%`, top: `${lastY}%` }}
        />
      )}
    </div>
  );
}
