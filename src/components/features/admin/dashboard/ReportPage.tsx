"use client";

import type { ReactNode } from "react";
import { useDashboardReport, type ReportProps } from "@/hooks/admin/useReports";
import { useReportWideLayout } from "@/hooks/useMinWidth";
import { Button } from "@/components/atoms";
import { EmptyState } from "@/components/molecules";
import AdminShell from "@/components/features/admin/shell/AdminShell";
import PeriodSwitch from "@/components/features/admin/dashboard/PeriodSwitch";
import { ReportSkeleton } from "@/components/features/admin/skeletons/skeletons";

// The frame of the Dashboard, Sales and Performance pages: the period switch (All time among the
// periods), the numbers for that period (hooks/admin/useReports), a skeleton of the page the first
// time, and a retry when they can't be loaded. Each page draws its own cards from the same numbers.
// The switch sits in the top bar from 112rem (1792px), where all six periods fit beside the rest of
// the bar; below that it gets its own row under the top bar, above the cards.
interface ReportPageProps {
  title: string;
  children: (report: ReportProps) => ReactNode;
}

export default function ReportPage({ title, children }: ReportPageProps) {
  const { range, setRange, data, loading, failed, retry } = useDashboardReport(title);
  const wide = useReportWideLayout();
  const switchIn = wide;
  const switchRow = !wide;

  if (!data && loading) return <ReportSkeleton title={title} />;

  if (!data) {
    return (
      <AdminShell title={title}>
        <EmptyState
          kind="error"
          title={`We couldn't load ${title === "Dashboard" ? "the dashboard" : title.toLowerCase()}`}
          message="This is usually a weak connection, or the server is busy for a moment. Nothing was lost. Please try again."
        >
          <Button type="button" onClick={retry}>
            Try again
          </Button>
          <Button variant="secondary" to="/clients">
            Open appointments
          </Button>
        </EmptyState>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={title} actions={switchIn && <div className="min-w-0"><PeriodSwitch value={range} onChange={setRange} /></div>}>
      {/* The page scrolls under the top bar, with the switch (below 112rem) as its first row */}
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-2 pr-1 md:gap-6">
        {/* shrink-0: the scroller is a column, and a sideways-scrolling row would be squashed in it */}
        {switchRow && (
          <div className="shrink-0">
            <PeriodSwitch value={range} onChange={setRange} />
          </div>
        )}
        {children({ data, loading, failed })}
      </div>
    </AdminShell>
  );
}
