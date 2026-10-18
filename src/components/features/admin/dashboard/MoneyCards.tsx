import { Banknote, Hourglass, ReceiptText, Undo2 } from "lucide-react";
import { describeChange, peso } from "@/lib/dashboardFormat";
import { formatBucketLabel, granularityWord, type Granularity } from "@/lib/dashboardTrend";
import type { Money, MoneyPoint } from "@/services/dashboardTypes";
import { StatCard } from "@/components/molecules";
import Sparkline from "@/components/features/admin/dashboard/Sparkline";
import StatInfoTip from "@/components/features/admin/dashboard/StatInfoTip";

interface MoneyCardsProps {
  money: Money;
  /** What each of `money.points` covers */
  granularity?: Granularity;
}

// The period's money for the salon's financial statements (see Money): what came in, the
// downpayments still held for visits to come, what was kept from cancellations and no-shows plus
// late fees, and what was refunded. Each card has a small line over the period, like the stat cards.
export default function MoneyCards({ money, granularity = "day" }: MoneyCardsProps) {
  const line = (label: string, key: Exclude<keyof MoneyPoint, "date">) => {
    const points = money.points;
    if (points.length === 0) return undefined;
    const values = points.map((p) => p[key]);
    return (
      <Sparkline
        values={values}
        labels={points.map((p) => `${formatBucketLabel(granularity, p.date)}: ${peso(p[key])}`)}
        ariaLabel={`${label} ${granularityWord(granularity)}, from ${peso(values[0])} to ${peso(values[values.length - 1])}`}
      />
    );
  };

  return (
    <section aria-label="Money" className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
      <StatCard
        icon={Banknote}
        label="Gross receipts" info={<StatInfoTip label="Gross receipts" which="grossReceipts" />}
        value={peso(money.grossReceipts.value)}
        change={describeChange(money.grossReceipts.value, money.grossReceipts.previous)}
        hint="payments in, less refunds"
        sparkline={line("Gross receipts", "grossReceipts")}
      />
      <StatCard
        icon={Hourglass}
        label="Unearned" info={<StatInfoTip label="Unearned" which="unearned" />}
        value={peso(money.unearned.value)}
        change={describeChange(money.unearned.value, money.unearned.previous)}
        hint="held today for upcoming visits"
        sparkline={line("Unearned", "unearned")}
      />
      <StatCard
        icon={ReceiptText}
        label="Forfeits & late fees" info={<StatInfoTip label="Forfeits & late fees" which="otherIncome" />}
        value={peso(money.otherIncome.value)}
        change={describeChange(money.otherIncome.value, money.otherIncome.previous)}
        hint="kept downpayments + late fees"
        sparkline={line("Forfeits and late fees", "otherIncome")}
      />
      <StatCard
        icon={Undo2}
        label="Refunds" info={<StatInfoTip label="Refunds" which="refunds" />}
        value={peso(money.refunds.value)}
        change={describeChange(money.refunds.value, money.refunds.previous)}
        hint="downpayments returned"
        lowerIsBetter
        sparkline={line("Refunds", "refunds")}
      />
    </section>
  );
}
