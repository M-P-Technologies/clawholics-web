"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DEFAULT_RANGE, type DashboardRange } from "../../lib/dashboardPeriods";
import { fetchAppointmentPage, type AppointmentPage, type AppointmentPageParams } from "../../services/appointmentService";
import { adminKeys } from "@/lib/adminQueries";
import { fetchDashboard, fetchUtilization } from "../../services/dashboardService";
import type { DashboardResponse } from "../../services/dashboardTypes";

/** Loads one page of the admin appointment list */
export type BookingsLoader = (params: AppointmentPageParams) => Promise<AppointmentPage>;

/** What a report page draws from: the period's numbers, and whether they're being reloaded */
export interface ReportProps {
  data: DashboardResponse;
  loading: boolean;
  failed: boolean;
}

// The numbers behind the Dashboard, Sales and Performance pages (GET /dashboard) for the chosen
// period, with a retry for when they can't be loaded. One TanStack query per period: it waits for
// Clerk's session, so it isn't asked once before the user loads and again after, and every caller
// (React's dev double-mount, or switching between the three pages) shares one request and copy.
export function useDashboardReport(title: string) {
  const { getToken, isLoaded } = useAuth();
  const { user } = useUser();
  const [range, setRange] = useState<DashboardRange>(DEFAULT_RANGE);

  const query = useQuery({
    queryKey: adminKeys.dashboard(range),
    queryFn: async () => {
      try {
        return await fetchDashboard(range, await getToken(), user?.id);
      } catch (error) {
        console.error(`${title} failed to load:`, error);
        throw error;
      }
    },
    enabled: isLoaded,
    // While another period loads, the last one stays on screen (faded); a late answer for an
    // earlier period lands under its own key, so it can't replace the period now chosen
    placeholderData: keepPreviousData,
  });

  return {
    range,
    setRange,
    data: query.data ?? null,
    // Also while waiting for Clerk (the query is pending but not yet fetching)
    loading: query.isFetching || (query.isPending && !query.isError),
    failed: query.isError,
    retry: () => {
      void query.refetch();
    },
  };
}

// Loads one page of bookings for the dashboard's bookings table and today's bookings (each asks
// the server for just what it shows, instead of sharing the whole list)
export function useBookingsLoader() {
  const { getToken } = useAuth();
  const { user } = useUser();
  return useCallback(
    async (params: AppointmentPageParams) => fetchAppointmentPage(params, await getToken(), user?.id),
    [getToken, user?.id],
  );
}

/** Loads the artist utilization of the week holding a date */
export function useUtilizationLoader() {
  const { getToken } = useAuth();
  const { user } = useUser();
  return useCallback(async (date: string) => fetchUtilization(date, await getToken(), user?.id), [getToken, user?.id]);
}
