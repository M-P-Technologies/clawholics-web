"use client";

import { useState } from "react";
import { useMyAccount } from "./useMyAccount";

export type AppointmentsTab = "upcoming" | "past";

// The Appointments screen: the account's visits, which list is shown (upcoming or past), and the
// ids of the visits already reviewed
export function useMyAppointments() {
  const account = useMyAccount();
  const [tab, setTab] = useState<AppointmentsTab>("upcoming");
  const upcoming = tab === "upcoming";

  return {
    account,
    tab,
    setTab,
    tabs: [
      { value: "upcoming" as const, label: "Upcoming", count: account.upcoming.length },
      { value: "past" as const, label: "Past", count: account.pastViews.length },
    ],
    /** The visits in the open list */
    views: upcoming ? account.upcoming : account.pastViews,
    reviewedIds: new Set(Object.keys(account.reviews).map(Number)),
    emptyText: upcoming ? "Nothing coming up yet." : "No past appointments to show.",
    tableLabel: upcoming ? "Upcoming appointments" : "Past appointments",
    openView: (view: { appt: { id: number } }) => account.openAppointment(view.appt.id),
  };
}
