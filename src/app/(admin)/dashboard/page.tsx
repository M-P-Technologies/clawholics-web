"use client";

import DashboardView from "@/components/features/admin/dashboard/DashboardView";
import ReportPage from "@/components/features/admin/dashboard/ReportPage";
import { useBookingsLoader } from "@/hooks/admin/useReports";

// The admin landing page: what the salon checks every day
export default function Dashboard() {
  const loadBookings = useBookingsLoader();
  return <ReportPage title="Dashboard">{(report) => <DashboardView {...report} loadBookings={loadBookings} />}</ReportPage>;
}
