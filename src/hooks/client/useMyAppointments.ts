"use client";

import { useState } from "react";
import { useClientWideLayout } from "../useMinWidth";
import { useMyAccount } from "./useMyAccount";

type AppointmentsTab = "upcoming" | "past";

// The Appointments screen: the account's visits, which list is shown (upcoming or past), the ids of
// the visits already reviewed, and (as in Explore) the visit shown in the panel beside the list
export function useMyAppointments() {
  const account = useMyAccount();
  const [tab, setTab] = useState<AppointmentsTab>("upcoming");
  const upcoming = tab === "upcoming";
  const [chosenId, setChosenId] = useState<number | null>(null);
  // From `lg` up the panel beside the list shows the visit; below it there's no panel, so a visit
  // opens in the drawer
  const wide = useClientWideLayout();
  const views = upcoming ? account.upcoming : account.pastViews;
  const selected = views.find((v) => v.appt.id === chosenId) ?? views[0] ?? null;

  return {
    account,
    tab,
    setTab,
    tabs: [
      { value: "upcoming" as const, label: "Upcoming", count: account.upcoming.length },
      { value: "past" as const, label: "Past", count: account.pastViews.length },
    ],
    /** The visits in the open list */
    views,
    /** The visit in the panel: the one picked if it's in this list, else the first */
    selected,
    /** The row marked as showing in the panel: only while the panel is there (lg and up) */
    selectedRowId: wide ? (selected?.appt.id ?? null) : undefined,
    reviewedIds: new Set(Object.keys(account.reviews).map(Number)),
    emptyText: upcoming ? "Nothing coming up yet." : "No past appointments to show.",
    tableLabel: upcoming ? "Upcoming appointments" : "Past appointments",
    openView: (view: { appt: { id: number } }) => (wide ? setChosenId(view.appt.id) : account.openAppointment(view.appt.id)),
  };
}
