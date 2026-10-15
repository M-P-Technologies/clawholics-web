import clsx from "clsx";
import { DASHBOARD_RANGES, type DashboardRange } from "../lib/dashboardPeriods";
import Button from "../../../components/ui/Button";

export const PERIOD_LABELS: Record<DashboardRange, string> = {
  week: "This week",
  month: "This month",
  last30: "Last 30 days",
  last90: "Last 3 months",
  year: "This year",
};

interface PeriodSwitchProps {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
}

// A row of chips that scrolls sideways when it does not fit (in the top bar it gives way to the
// rest of the bar); its slim scrollbar shows only while the row is hovered
export default function PeriodSwitch({ value, onChange }: PeriodSwitchProps) {
  return (
    <div role="group" aria-label="Period" className="hover-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:min-w-0 lg:px-0">
      {DASHBOARD_RANGES.map((range) => (
        <Button
          key={range}
          variant="bare"
          type="button"
          aria-pressed={value === range}
          onClick={() => onChange(range)}
          className={clsx(
            "shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors",
            value === range ? "border-berry bg-berry text-pearl shadow-petal" : "border-crimson-light bg-milk/70 text-gray-red hover:border-crimson hover:text-berry",
          )}
        >
          {PERIOD_LABELS[range]}
        </Button>
      ))}
    </div>
  );
}
