import { STAT_INFO } from "@/lib/dashboardInfo";
import { InfoTip } from "@/components/organisms";

interface StatInfoTipProps {
  /** The card's label */
  label: string;
  which: keyof typeof STAT_INFO;
}

// A report card's ⓘ note: what the number is, and how it's counted (wording in lib/dashboardInfo)
export default function StatInfoTip({ label, which }: StatInfoTipProps) {
  const { about, how } = STAT_INFO[which];
  return (
    <InfoTip label={label}>
      <span className="block">{about}</span>
      <span className="block">
        <span className="font-bold">How it&apos;s counted: </span>
        {how}
      </span>
    </InfoTip>
  );
}
