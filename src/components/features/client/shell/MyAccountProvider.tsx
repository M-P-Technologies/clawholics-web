"use client";

import { useState, type ReactNode } from "react";
import { useLocation } from "@/lib/router";
import { Button, LoadingBar } from "@/components/atoms";
import { useMyReviews } from "@/hooks/useMyReviews";
import { useProfile } from "@/hooks/useProfile";
import { MyAccountContext, type MyAccount } from "@/hooks/client/useMyAccount";
import AccountOverlays from "@/components/features/client/shell/AccountOverlays";
import { CLIENT_PATHS } from "@/lib/client/clientNav";

// Loads the client's profile, appointments and stamps once for every tab (and refreshes them every
// 30 seconds, see useProfile), and draws the sheets any tab can open.
export default function MyAccountProvider({ children }: { children: ReactNode }) {
  const profile = useProfile();
  const { pathname } = useLocation();
  const { reviews, submit } = useMyReviews();
  // undefined = not chosen yet: arriving for one appointment (?appointment_id=) opens that one,
  // except on the payment confirmation, which carries the same id and must stay in view
  const [chosenId, setOpenId] = useState<number | null | undefined>(undefined);
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const arrivedFor = pathname === CLIENT_PATHS.confirmation ? null : profile.highlightedAppointmentId;
  const openId = chosenId === undefined ? arrivedFor : chosenId;

  if (profile.loadError && !profile.dbUser) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-4 text-center text-gray-red">
        <h1 className="font-display text-2xl font-normal normal-case tracking-normal">We couldn&apos;t load your account</h1>
        <p>Please check your connection and try again.</p>
        <div className="flex gap-3">
          <Button type="button" onClick={profile.retryLoad}>Try again</Button>
          <Button variant="secondary" to="/">Back to site</Button>
        </div>
      </div>
    );
  }

  if (profile.isBusy || !profile.dbUser) return <LoadingBar label="Loading your account" />;

  const account: MyAccount = {
    ...profile,
    reviews,
    submitReview: submit,
    openAppointment: (id) => setOpenId(id),
    openRewards: () => setRewardsOpen(true),
  };

  return (
    <MyAccountContext.Provider value={account}>
      {children}
      <AccountOverlays account={account} openId={openId} setOpenId={setOpenId} rewardsOpen={rewardsOpen} setRewardsOpen={setRewardsOpen} />
    </MyAccountContext.Provider>
  );
}
