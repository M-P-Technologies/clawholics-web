"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback } from "react";
import PerformanceView from "../components/admin/dashboard/PerformanceView";
import { fetchUtilization } from "../services/dashboardService";
import ReportPage from "./ReportPage";

// How the salon is doing with its clients and its team: the salon's size, the key rates, artist
// utilization, and when and with whom clients book
export default function Performance() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const loadUtilization = useCallback(async (date: string) => fetchUtilization(date, await getToken(), user?.id), [getToken, user?.id]);

  return <ReportPage title="Performance">{(report) => <PerformanceView {...report} loadUtilization={loadUtilization} />}</ReportPage>;
}
