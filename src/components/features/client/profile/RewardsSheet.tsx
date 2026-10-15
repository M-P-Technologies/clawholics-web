import { Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { themeColor } from "@/services/themeColor";
import { Button } from "@/components/atoms";
import { Dialog } from "@/components/organisms";
import { DEFAULT_STAMP_TARGET, stampsToGo } from "@/utils/profileView";

interface RewardsSheetProps {
  open: boolean;
  onClose: () => void;
  stamps: number;
  /** The stamps the card needs for a reward */
  target?: number;
  cardNumber: string;
  clerkId?: string | null;
  onRedeem: () => void;
}

// The full loyalty card and the QR code the salon scans to add stamps.
export default function RewardsSheet({ open, onClose, stamps, target = DEFAULT_STAMP_TARGET, cardNumber, clerkId, onRedeem }: RewardsSheetProps) {
  const stampCells = Array.from({ length: target }, (_, i) => ({ number: i + 1, isEarned: i + 1 <= stamps }));
  const left = stampsToGo(stamps, target);
  const full = left === 0;

  return (
    <Dialog open={open} title="Loyalty card" onClose={onClose} placement="drawer">
      <div className="flex flex-col gap-4">
        <div
          className={`flex flex-col overflow-hidden rounded-2xl border ${
            full ? "border-crimson bg-crimson-light/30" : "border-crimson-light/60 bg-light-orange/40"
          }`}
        >
          <div className="flex flex-col gap-0.5 bg-berry px-4 py-3">
            <p className="font-display text-xl text-pearl">Clawholics Loyalty Card</p>
            <p className="break-all text-[12px] text-pearl/80">{cardNumber}</p>
          </div>
          <div className="flex flex-col gap-4 p-4">
            <p className="text-[13px] font-medium text-gray-red/80">Stamp Card — {Math.min(stamps, target)}/{target}</p>
            <div className="grid w-full grid-cols-5 gap-2">
              {stampCells.map(({ number, isEarned }) => (
                <div
                  key={number}
                  className={`flex aspect-square items-center justify-center rounded-full text-sm font-bold ${
                    isEarned ? "bg-crimson text-light-orange shadow-sm" : "border-2 border-dashed border-crimson-light text-gray-red/50"
                  }`}
                >
                  {isEarned ? <Check size={18} strokeWidth={3} aria-label={`Stamp ${number}`} /> : number}
                </div>
              ))}
            </div>
            {full ? (
              <Button type="button" onClick={onRedeem} className="w-full">Redeem reward</Button>
            ) : (
              <p className="text-center text-[13px] text-gray-red/80">
                {left} more visit{left === 1 ? "" : "s"} to earn a reward!
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-2xl bg-crimson-light/15 p-4 text-center text-gray-red">
          <p className="font-display text-lg text-gray-red">Your QR code</p>
          <div className="flex aspect-square w-48 items-center justify-center rounded-xl border border-crimson-light/60 bg-milk p-4">
            <QRCodeSVG
              value={JSON.stringify({ userId: clerkId, action: "stamp" })}
              size={256}
              style={{ height: "100%", width: "100%" }}
              bgColor={themeColor("milk")}
              fgColor={themeColor("gray-red")}
              level="H"
            />
          </div>
          <p className="max-w-[16rem] text-[12px] text-gray-red/70">Show this QR code at the salon to earn stamps and redeem rewards.</p>
        </div>
      </div>
    </Dialog>
  );
}
