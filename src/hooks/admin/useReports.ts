"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_RANGE, type DashboardRange } from "../../lib/dashboardPeriods";
import { fetchAppointments, type Appointment } from "../../services/appointmentService";
import { fetchDashboard, fetchUtilization } from "../../services/dashboardService";
import type { DashboardResponse } from "../../services/dashboardTypes";

/** What a report page draws from: the period's numbers, and whether they're being reloaded */
export interface ReportProps {
  data: DashboardResponse;
  loading: boolean;
  failed: boolean;
}

// The numbers behind the Dashboard, Sales and Performance pages (GET /dashboard) for the chosen
// period, with a retry for when they can't be loaded
export function useDashboardReport(title: string) {
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

  return { range, setRange, data, loading, failed, retry: () => setAttempt((n) => n + 1) };
}

// The dashboard's bookings table and today's bookings share one request; a failed one is asked again
export function useBookingsLoader() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const bookings = useRef<Promise<Appointment[]> | null>(null);
  return useCallback(() => {
    bookings.current ??= (async () => fetchAppointments(undefined, await getToken(), user?.id))().catch((error) => {
      bookings.current = null;
      throw error;
    });
    return bookings.current;
  }, [getToken, user?.id]);
}

/** Loads the artist utilization of the week holding a date */
export function useUtilizationLoader() {
  const { getToken } = useAuth();
  const { user } = useUser();
  return useCallback(async (date: string) => fetchUtilization(date, await getToken(), user?.id), [getToken, user?.id]);
}
