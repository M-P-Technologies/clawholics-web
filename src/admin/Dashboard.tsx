"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useRef } from "react";
import DashboardView from "../components/admin/dashboard/DashboardView";
import { fetchAppointments, type Appointment } from "../services/appointmentService";
import ReportPage from "./ReportPage";

// The admin landing page: what the salon checks every day
export default function Dashboard() {
  const { getToken } = useAuth();
  const { user } = useUser();
  // The bookings table and today's bookings share one request; a failed one is asked again
  const bookings = useRef<Promise<Appointment[]> | null>(null);
  const loadBookings = useCallback(() => {
    bookings.current ??= (async () => fetchAppointments(undefined, await getToken(), user?.id))().catch((error) => {
      bookings.current = null;
      throw error;
    });
    return bookings.current;
  }, [getToken, user?.id]);

  return <ReportPage title="Dashboard">{(report) => <DashboardView {...report} loadBookings={loadBookings} />}</ReportPage>;
}
