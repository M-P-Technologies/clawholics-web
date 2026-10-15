import { Cake } from "lucide-react";
import Button from "../../../components/ui/Button";
import type { BirthdayVoucher } from "../api/voucherService";
import { CLAIMED_HINT, voucherUntil } from "../lib/voucherText";

interface Props {
  voucher: BirthdayVoucher;
  onClaim: () => void;
  isClaiming: boolean;
  error?: string;
}

// The client's birthday voucher on their profile: claim it, or (once claimed) its code
export default function BirthdayVoucherCard({ voucher, onClaim, isClaiming, error }: Props) {
  const claimed = voucher.status === "CLAIMED";
  return (
    <section aria-label="Your birthday voucher" className="flex flex-col gap-3 rounded-xl border border-crimson bg-crimson-light/30 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Cake size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-berry" />
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg leading-tight text-berry">Happy birthday! {voucher.discount_pct}% off this month</h3>
          {claimed ? (
            <p className="text-[13px] text-gray-red/80">
              Your code: <strong className="font-mono tracking-wider text-berry">{voucher.code}</strong>. {CLAIMED_HINT} Valid until {voucherUntil(voucher)}.
            </p>
          ) : (
            <p className="text-[13px] text-gray-red/80">A treat from us for your birthday month. Claim it before {voucherUntil(voucher)}.</p>
          )}
          {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
        </div>
      </div>
      {!claimed && (
        <Button type="button" onClick={onClaim} loading={isClaiming} loadingText="Claiming..." className="shrink-0">
          {`Claim ${voucher.discount_pct}% off`}
        </Button>
      )}
    </section>
  );
}
