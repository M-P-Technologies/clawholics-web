import { Banknote, Hourglass, ReceiptText, TrendingUp } from "lucide-react";
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

// The period's money for the salon's financial statements (see Money): what it earned (revenue),
// what came in (refunds are taken off it), the downpayments still held for visits to come, and what
// was kept from cancellations and no-shows plus late fees. Each card has a small line over the
// period, like the stat cards.
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
        icon={TrendingUp}
        label="Revenue" info={<StatInfoTip label="Revenue" which="revenue" />}
        value={peso(money.revenue.value)}
        change={describeChange(money.revenue.value, money.revenue.previous)}
        hint="earned from visits done"
        sparkline={line("Revenue", "revenue")}
      />
      <StatCard
        icon={Banknote}
        label="Gross income" info={<StatInfoTip label="Gross income" which="grossReceipts" />}
        value={peso(money.grossReceipts.value)}
        change={describeChange(money.grossReceipts.value, money.grossReceipts.previous)}
        hint="payments in, less refunds"
        sparkline={line("Gross income", "grossReceipts")}
      />
      <StatCard
        icon={Hourglass}
        label="Unearned income" info={<StatInfoTip label="Unearned income" which="unearned" />}
        value={peso(money.unearned.value)}
        change={describeChange(money.unearned.value, money.unearned.previous)}
        hint="held today for upcoming visits"
        sparkline={line("Unearned income", "unearned")}
      />
      <StatCard
        icon={ReceiptText}
        label="Forfeits & late fees" info={<StatInfoTip label="Forfeits & late fees" which="otherIncome" />}
        value={peso(money.otherIncome.value)}
        change={describeChange(money.otherIncome.value, money.otherIncome.previous)}
        hint="kept downpayments + late fees"
        sparkline={line("Forfeits and late fees", "otherIncome")}
      />
    </section>
  );
}
