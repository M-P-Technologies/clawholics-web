"use client";

import PerformanceView from "@/components/features/admin/dashboard/PerformanceView";
import ReportPage from "@/components/features/admin/dashboard/ReportPage";
import { useUtilizationLoader } from "@/hooks/admin/useReports";

// How the salon is doing with its clients and its team: the salon's size, the key rates, artist
// utilization, and when and with whom clients book
export default function Performance() {
  const loadUtilization = useUtilizationLoader();
  return <ReportPage title="Performance">{(report) => <PerformanceView {...report} loadUtilization={loadUtilization} />}</ReportPage>;
}
