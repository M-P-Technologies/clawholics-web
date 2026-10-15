import { Gift } from "lucide-react";
import clsx from "clsx";
import { DEFAULT_STAMP_TARGET, stampsToGo } from "../lib/profileView";
import Button from "../../../components/ui/Button";

// The loyalty card in short: the stamps so far and how many are left. Opens the full card.
export default function RewardsStrip({ stamps, target = DEFAULT_STAMP_TARGET, onOpen }: { stamps: number; target?: number; onOpen: () => void }) {
  const left = stampsToGo(stamps, target);
  return (
    <Button
      variant="bare"
      type="button"
      aria-label="Open your loyalty card"
      onClick={onOpen}
      className={clsx(
        "flex w-full flex-col items-stretch gap-3 whitespace-normal rounded-xl border p-4 text-left transition-colors",
        left === 0 ? "border-crimson bg-crimson-light/30" : "border-crimson-light/60 bg-light-orange/40 hover:border-crimson",
      )}
    >
      <span className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-2 text-[12px] text-gray-red/70">
          <Gift size={14} aria-hidden="true" className="text-berry" />
          Loyalty card
        </span>
        <span className="font-display text-xl leading-none text-berry">
          {Math.min(stamps, target)}
          <span className="text-sm text-gray-red/50"> / {target}</span>
        </span>
      </span>
      <span className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: target }, (_, i) => (
          <span
            key={i}
            data-testid="stamp-dot"
            data-earned={i < stamps}
            className={clsx("h-2.5 flex-1 rounded-full", i < stamps ? "bg-crimson" : "bg-crimson-light/60")}
          />
        ))}
      </span>
      <span className="text-[13px] text-gray-red/80">
        {left === 0 ? "Your reward is ready. Tap to redeem it." : `${left} more visit${left === 1 ? "" : "s"} to a reward`}
      </span>
    </Button>
  );
}
