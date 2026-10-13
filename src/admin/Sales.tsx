"use client";

import SalesView from "../components/admin/dashboard/SalesView";
import ReportPage from "./ReportPage";

// Where the money came from in the period: money cards, top services, how bookings ended and the sales record
export default function Sales() {
  return <ReportPage title="Sales">{(report) => <SalesView {...report} />}</ReportPage>;
}
