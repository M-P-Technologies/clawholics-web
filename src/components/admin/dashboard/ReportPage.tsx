"use client";

import type { ReactNode } from "react";
import { useDashboardReport, type ReportProps } from "../../../hooks/admin/useReports";
import Button from "../../ui/Button";
import { LoadingBar } from "../../ui/LoadingBar";
import StatePanel from "../../ui/StatePanel";
import AdminShell from "../AdminShell";
import PeriodSwitch from "./PeriodSwitch";

// The frame of the Dashboard, Sales and Performance pages: the period switch, the numbers for
// that period (hooks/admin/useReports), a full-page loader the first time, and a retry when they
// can't be loaded. Each page draws its own cards from the same numbers.
export default function ReportPage({ title, children }: { title: string; children: (report: ReportProps) => ReactNode }) {
  const { range, setRange, data, loading, failed, retry } = useDashboardReport(title);

  if (!data && loading) {
    return (
      <div className="fixed inset-0 z-9999 flex items-center justify-center bg-light-orange">
        <LoadingBar label={`Loading ${title.toLowerCase()}`} />
      </div>
    );
  }

  if (!data) {
    return (
      <AdminShell title={title}>
        <StatePanel
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
        </StatePanel>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={title} actions={<div className="min-w-0 lg:w-auto"><PeriodSwitch value={range} onChange={setRange} /></div>}>
      {children({ data, loading, failed })}
    </AdminShell>
  );
}
