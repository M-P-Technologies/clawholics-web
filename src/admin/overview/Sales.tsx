"use client";

import ReportPage from "@/components/features/admin/dashboard/ReportPage";
import SalesView from "@/components/features/admin/dashboard/SalesView";

// Where the money came from in the period: money cards, top services, how bookings ended and the sales record
export default function Sales() {
  return <ReportPage title="Sales">{(report) => <SalesView {...report} />}</ReportPage>;
}
