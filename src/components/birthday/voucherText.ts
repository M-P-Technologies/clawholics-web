import type { BirthdayVoucher } from "../../services/voucherService";

/** "October 31", from the voucher's last day (YYYY-MM-DD) */
export const voucherUntil = (v: BirthdayVoucher) =>
  new Date(`${v.valid_until}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

/** How a claimed voucher is used, until booking applies it on its own */
export const CLAIMED_HINT = "Show this code at the salon: it comes off the service price you pay there.";
