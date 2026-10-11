import { QRCodeSVG } from "qrcode.react";
import { themeColor } from "../../services/themeColor";
import Button from "../ui/Button";
import Sheet from "../ui/Sheet";
import { STAMP_TARGET, stampsToGo } from "../../utils/profileView";

interface RewardsSheetProps {
  open: boolean;
  onClose: () => void;
  stamps: number;
  cardNumber: string;
  clerkId?: string | null;
  onRedeem: () => void;
}

// The full loyalty card and the QR code the salon scans to add stamps.
export default function RewardsSheet({ open, onClose, stamps, cardNumber, clerkId, onRedeem }: RewardsSheetProps) {
  const stampCells = Array.from({ length: STAMP_TARGET }, (_, i) => ({ number: i + 1, isEarned: i + 1 <= stamps }));
  const left = stampsToGo(stamps);
  const full = left === 0;

  return (
    <Sheet open={open} title="Loyalty card" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div
          className={`flex flex-col overflow-hidden rounded-sm border shadow-xl shadow-crimson/10 ${
            full ? "border-crimson bg-crimson-light/30" : "border-crimson-light/80 bg-light-orange"
          }`}
        >
          <div className="flex flex-col gap-1 bg-crimson p-4">
            <p className="font-sans text-lg font-bold tracking-tight text-light-orange">Clawholics Loyalty Card</p>
            <p className="break-all font-sans text-sm text-light-orange opacity-90">{cardNumber}</p>
          </div>
          <div className="flex flex-col gap-4 p-4">
            <p className="text-sm font-bold text-gray-red">Stamp Card — {stamps}/{STAMP_TARGET}</p>
            <div className="grid w-full grid-cols-5 gap-2">
              {stampCells.map(({ number, isEarned }) => (
                <div
                  key={number}
                  className={`flex aspect-square items-center justify-center rounded-sm text-base font-bold ${
                    isEarned ? "border border-crimson bg-crimson text-light-orange" : "border border-crimson-light bg-light-orange text-gray-red"
                  }`}
                >
                  {number}
                </div>
              ))}
            </div>
            {full ? (
              <Button type="button" onClick={onRedeem} className="w-full">Redeem reward</Button>
            ) : (
              <p className="text-center copy-note">
                {left} more visit{left === 1 ? "" : "s"} to earn a reward!
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 rounded-sm border border-crimson-light/80 bg-light-orange p-4 text-center text-gray-red">
          <p className="label-caps">Your QR code</p>
          <div className="flex aspect-square w-48 items-center justify-center rounded-sm border border-crimson-light bg-light-orange p-4">
            <QRCodeSVG
              value={JSON.stringify({ userId: clerkId, action: "stamp" })}
              size={256}
              style={{ height: "100%", width: "100%" }}
              bgColor={themeColor("light-orange")}
              fgColor={themeColor("gray-red")}
              level="H"
            />
          </div>
          <p className="copy-note max-w-[16rem]">Show this QR code at the salon to earn stamps and redeem rewards.</p>
        </div>
      </div>
    </Sheet>
  );
}
