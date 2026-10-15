"use client";

import { useEffect, useState } from "react";
import { Cake } from "lucide-react";
import { Button } from "@/components/atoms";
import { useLocation } from "@/lib/router";
import { useBirthdayVoucher } from "../../hooks/useBirthdayVoucher";
import { CLAIMED_HINT, voucherUntil } from "./voucherText";

// Pages where the pop-up would be in the way (the profile shows the voucher itself)
const QUIET_PATHS = ["/login", "/signup", "/onboarding", "/booking", "/payment", "/reschedule", "/profile"];

const seenKey = (voucherId: number) => `birthday-voucher-popup:${voucherId}`;
const wasSeen = (voucherId: number) => {
  try {
    return sessionStorage.getItem(seenKey(voucherId)) === "1";
  } catch {
    return false;
  }
};
const markSeen = (voucherId: number) => {
  try {
    sessionStorage.setItem(seenKey(voucherId), "1");
  } catch {
    // Private mode: it may show again on the next page load
  }
};

// The birthday pop-up: shown once a session to a signed-in client whose voucher for their birthday
// month is still unclaimed. Claiming shows the code; the profile keeps showing it afterwards.
export default function BirthdayVoucherPopup() {
  const { pathname } = useLocation();
  const { voucher, claim, isClaiming, claimError } = useBirthdayVoucher();
  const [openId, setOpenId] = useState<number | null>(null);

  const offer = voucher?.status === "ISSUED" ? voucher : null;
  const quiet = QUIET_PATHS.some((path) => pathname.startsWith(path));
  useEffect(() => {
    if (!offer || quiet || openId !== null || wasSeen(offer.id)) return;
    markSeen(offer.id);
    setOpenId(offer.id); // eslint-disable-line react-hooks/set-state-in-effect -- sessionStorage is read after hydration
  }, [offer, quiet, openId]);

  // Leaving for a quiet page (e.g. Book) hides it
  if (openId === null || quiet || !voucher || voucher.id !== openId) return null;
  const claimed = voucher.status === "CLAIMED";
  const close = () => setOpenId(-1);

  return (
    <div className="fixed inset-0 z-999 flex items-end justify-center bg-gray-red/40 px-9 backdrop-blur-sm drawer-backdrop sm:items-center max-sm:p-0">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="birthday-popup-title"
        className="flex w-full max-w-md flex-col items-center gap-3 rounded-sm border border-crimson-light bg-light-orange p-6 text-center text-gray-red shadow-2xl shadow-crimson/20 drawer-panel md:p-9 max-sm:max-h-[90vh] max-sm:max-w-none max-sm:overflow-y-auto max-sm:rounded-t-md max-sm:rounded-b-none"
      >
        <Cake size={36} aria-hidden="true" className="text-berry" />
        <h2 id="birthday-popup-title" className="font-display text-2xl uppercase tracking-widest text-gray-red">
          Happy birthday!
        </h2>
        {claimed ? (
          <p className="leading-relaxed text-gray-red">
            It&apos;s yours: <strong className="font-mono tracking-wider text-berry">{voucher.code}</strong>. {CLAIMED_HINT} Valid until{" "}
            {voucherUntil(voucher)}; you&apos;ll also find it on your profile.
          </p>
        ) : (
          <p className="leading-relaxed text-gray-red">
            To celebrate your birthday month, here&apos;s <strong>{voucher.discount_pct}% off</strong> a service of your choice, until {voucherUntil(voucher)}.
          </p>
        )}
        {claimError && <p role="alert" className="text-sm text-danger-ink">{claimError.message}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          {claimed ? (
            <Button type="button" onClick={close}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" type="button" onClick={close}>Maybe later</Button>
              <Button type="button" onClick={() => claim().catch(() => {})} loading={isClaiming} loadingText="Claiming...">
                {`Claim ${voucher.discount_pct}% off`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
