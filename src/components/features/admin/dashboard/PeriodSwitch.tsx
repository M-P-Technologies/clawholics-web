import { DASHBOARD_RANGES, type DashboardRange } from "@/lib/dashboardPeriods";
import { SegmentedControl } from "@/components/molecules";

export const PERIOD_LABELS: Record<DashboardRange, string> = {
  week: "This week",
  month: "This month",
  last30: "Last 30 days",
  last90: "Last 3 months",
  year: "This year",
  all: "All time",
};

const PERIOD_OPTIONS = DASHBOARD_RANGES.map((range) => ({ value: range, label: PERIOD_LABELS[range] }));

interface PeriodSwitchProps {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
}

// The admin's pill switch (SegmentedControl, like Day | Month and Edit | Preview). It scrolls
// sideways when it does not fit (in the top bar it gives way to the rest of the bar); its slim
// scrollbar shows only while the row is hovered.
export default function PeriodSwitch({ value, onChange }: PeriodSwitchProps) {
  return (
    <div className="hover-scrollbar min-w-0 overflow-x-auto pb-1">
      <SegmentedControl label="Period" options={PERIOD_OPTIONS} value={value} onChange={onChange} className="w-max" />
    </div>
  );
}
