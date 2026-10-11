import { Gift } from "lucide-react";
import clsx from "clsx";
import { STAMP_TARGET, stampsToGo } from "../../utils/profileView";
import Button from "../ui/Button";

export default function RewardsStrip({ stamps, onOpen }: { stamps: number; onOpen: () => void }) {
  const left = stampsToGo(stamps);
  return (
    <Button
      variant="bare"
      type="button"
      aria-label="Open your loyalty card"
      onClick={onOpen}
      className={clsx(
        "flex w-full flex-col items-stretch gap-3 whitespace-normal rounded-sm border bg-light-orange p-4 text-left shadow-xl shadow-crimson/10 transition-colors md:p-6",
        left === 0 ? "border-crimson bg-crimson-light/30" : "border-crimson-light/80 hover:border-crimson",
      )}
    >
      <span className="flex items-center justify-between gap-4">
        <span className="label-caps flex items-center gap-2">
          <Gift size={16} aria-hidden="true" className="text-crimson" />
          Loyalty card
        </span>
        <span className="text-sm font-bold text-crimson">{Math.min(stamps, STAMP_TARGET)}/{STAMP_TARGET}</span>
      </span>
      <span className="flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: STAMP_TARGET }, (_, i) => (
          <span
            key={i}
            data-testid="stamp-dot"
            data-earned={i < stamps}
            className={clsx("h-3 flex-1 rounded-full", i < stamps ? "bg-crimson" : "bg-crimson-light/60")}
          />
        ))}
      </span>
      <span className="copy-note">
        {left === 0 ? "Your reward is ready. Tap to redeem it." : `${left} more visit${left === 1 ? "" : "s"} to a reward`}
      </span>
    </Button>
  );
}
