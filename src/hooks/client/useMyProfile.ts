"use client";

import { useClerk } from "@clerk/nextjs";
import { completedVisits } from "../../lib/client/appointments";
import { fullName, memberSince, nextVisitHighlight, profileRows, rewardsLine } from "../../lib/client/profile";
import { clientTrackerSteps } from "../../lib/client/tracker";
import { useMyAccount } from "./useMyAccount";

// The Profile screen: the account's details for the profile panel, the counts, the booking to
// track, and the Clerk account actions
export function useMyProfile() {
  const account = useMyAccount();
  const { openUserProfile, signOut } = useClerk();
  const user = account.dbUser!;
  const next = account.nextAppointment;
  const since = memberSince(user);

  return {
    account,
    name: fullName(user),
    imageUrl: account.clerkUser?.imageUrl ?? "",
    since,
    sinceLabel: since || "—",
    stampsLabel: `${account.stamps} ${account.stamps === 1 ? "stamp" : "stamps"}`,
    highlight: nextVisitHighlight(next),
    rows: profileRows(user, account.formatDisplayDate),
    visits: String(completedVisits(account.appointments)),
    /** The next booking's progress; null when there's nothing booked */
    trackerSteps: next ? clientTrackerSteps(next.appt) : null,
    rewardsLine: rewardsLine(account.stamps),
    manageAccount: () => openUserProfile(),
    logOut: () => signOut({ redirectUrl: "/" }),
  };
}
