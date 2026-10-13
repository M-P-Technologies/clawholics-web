"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useState, type ReactNode } from "react";
import AdminShell from "../components/admin/AdminShell";
import PeriodSwitch from "../components/admin/dashboard/PeriodSwitch";
import Button from "../components/ui/Button";
import { LoadingBar } from "../components/ui/LoadingBar";
import StatePanel from "../components/ui/StatePanel";
import { DEFAULT_RANGE, type DashboardRange } from "../lib/dashboardPeriods";
import { fetchDashboard } from "../services/dashboardService";
import type { DashboardResponse } from "../services/dashboardTypes";

export interface ReportProps {
  data: DashboardResponse;
  loading: boolean;
  failed: boolean;
}

// The frame of the Dashboard, Sales and Performance pages: the period switch, the numbers for
// that period (GET /dashboard), a full-page loader the first time, and a retry when they can't be
// loaded. Each page draws its own cards from the same numbers.
export default function ReportPage({ title, children }: { title: string; children: (report: ReportProps) => ReactNode }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [range, setRange] = useState<DashboardRange>(DEFAULT_RANGE);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // A late answer for an earlier period must not replace the one for the period now chosen
    let current = true;
    (async () => {
      setLoading(true);
      setFailed(false);
      try {
        const token = await getToken();
        const result = await fetchDashboard(range, token, user?.id);
        if (current) setData(result);
      } catch (error) {
        console.error(`${title} failed to load:`, error);
        if (current) setFailed(true);
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
    };
  }, [range, attempt, getToken, user?.id, title]);

  if (!data && loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-light-orange">
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
          <Button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
          <Button variant="secondary" to="/appointments">
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
