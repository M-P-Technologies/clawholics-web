"use client";

import { useState } from "react";

export type AppointmentsTab = "upcoming" | "past";

/** Which list the Appointments screen shows */
export function useAppointmentsTab() {
  const [tab, setTab] = useState<AppointmentsTab>("upcoming");
  return { tab, setTab };
}
