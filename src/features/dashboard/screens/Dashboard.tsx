"use client";

import DashboardView from "../components/DashboardView";
import ReportPage from "../components/ReportPage";
import { useBookingsLoader } from "../hooks/useReports";

// The admin landing page: what the salon checks every day
export default function Dashboard() {
  const loadBookings = useBookingsLoader();
  return <ReportPage title="Dashboard">{(report) => <DashboardView {...report} loadBookings={loadBookings} />}</ReportPage>;
}
