"use client";

import DashboardView from "@/components/features/admin/dashboard/DashboardView";
import ReportPage from "@/components/features/admin/dashboard/ReportPage";
import { useAttentionLoader, useBookingsLoader } from "@/hooks/admin/useReports";

// The admin landing page: what the salon checks every day
export default function Dashboard() {
  const loadBookings = useBookingsLoader();
  const loadAttention = useAttentionLoader();
  return <ReportPage title="Dashboard">{(report) => <DashboardView {...report} loadBookings={loadBookings} loadAttention={loadAttention} />}</ReportPage>;
}
