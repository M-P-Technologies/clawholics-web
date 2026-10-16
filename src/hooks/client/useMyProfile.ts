"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { completedVisits } from "../../lib/client/appointments";
import { fullName, memberSince, nextVisitHighlight, profileRows, rewardsLine } from "../../lib/client/profile";
import { clientTrackerSteps } from "../../lib/client/tracker";
import { useMyAccount } from "./useMyAccount";

export type ProfileTab = "overview" | "loyalty";

// The Profile screen: the account's details for the profile panel, the counts, the booking to
// track, the loyalty card's tab, and the Clerk account actions
export function useMyProfile() {
  const account = useMyAccount();
  const { openUserProfile, signOut } = useClerk();
  const user = account.dbUser!;
  const next = account.nextAppointment;
  const since = memberSince(user);
  const [tab, setTab] = useState<ProfileTab>("overview");

  return {
    account,
    tab,
    setTab,
    tabs: [
      { value: "overview" as const, label: "Overview" },
      { value: "loyalty" as const, label: "Loyalty card" },
    ],
    name: fullName(user),
    imageUrl: account.clerkUser?.imageUrl ?? "",
    since,
    sinceLabel: since || "Not available",
    stampsLabel: `${account.stamps} ${account.stamps === 1 ? "stamp" : "stamps"}`,
    highlight: nextVisitHighlight(next),
    rows: profileRows(user, account.formatDisplayDate),
    visits: String(completedVisits(account.appointments)),
    /** The next booking's progress; null when there's nothing booked */
    trackerSteps: next ? clientTrackerSteps(next.appt) : null,
    rewardsLine: rewardsLine(account.stamps, account.stampTarget),
    /** "4 / 10": the stamps on the card, capped at the salon's target */
    stampsValue: `${Math.min(account.stamps, account.stampTarget)} / ${account.stampTarget}`,
    manageAccount: () => openUserProfile(),
    logOut: () => signOut({ redirectUrl: "/" }),
  };
}
