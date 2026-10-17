import { CalendarClock, CircleSlash, HandCoins, Repeat } from "lucide-react";
import { describeChange, peso } from "@/lib/dashboardFormat";
import { formatBucketLabel, granularityWord, type DayValues, type Trend } from "@/lib/dashboardTrend";
import type { Money } from "@/services/dashboardTypes";
import { StatCard } from "@/components/molecules";
import Sparkline from "@/components/features/admin/dashboard/Sparkline";

const visits = (n: number) => `still to pay, ${n} confirmed ${n === 1 ? "visit" : "visits"}`;

interface MoneyCardsProps {
  money: Money;
  /** The period's sales, for the returning clients' share of it */
  revenue?: number;
  /** The period day by day (or week, or month), for the cards' lines */
  trend?: Trend;
}

// The period's money, from the visits completed with the booking tracker (see Money). Each
// card has a small line like the stat cards: over the period, except Booked ahead, which looks
// forward from today to the period's end.
export default function MoneyCards({ money, revenue = 0, trend }: MoneyCardsProps) {
  const share = revenue > 0 ? `${Math.round((money.returningRevenue.value / revenue) * 100)}% of sales, ` : "";

  const line = (label: string, key: keyof DayValues) => {
    const points = trend?.points ?? [];
    if (!trend || points.length === 0) return undefined;
    const values = points.map((p) => p[key]);
    return (
      <Sparkline
        values={values}
        labels={points.map((p) => `${formatBucketLabel(trend.granularity, p.date)}: ${peso(p[key])}`)}
        ariaLabel={`${label} ${granularityWord(trend.granularity)}, from ${peso(values[0])} to ${peso(values[values.length - 1])}`}
      />
    );
  };
  const { days, granularity: aheadGranularity } = money.bookedAhead;
  const aheadLine =
    days.length === 0 ? undefined : (
      <Sparkline
        values={days.map((d) => d.value)}
        labels={days.map((d) => `${formatBucketLabel(aheadGranularity, d.date)}: ${peso(d.value)}`)}
        ariaLabel={`Booked ahead ${granularityWord(aheadGranularity)} to the period's end, from ${peso(days[0].value)} to ${peso(days[days.length - 1].value)}`}
      />
    );

  return (
    <section aria-label="Money" className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
      <StatCard
        icon={HandCoins}
        label="Balance at the salon"
        value={peso(money.balanceAtSalon.value)}
        change={describeChange(money.balanceAtSalon.value, money.balanceAtSalon.previous)}
        hint="as recorded when completed"
        sparkline={line("Balance at the salon", "balanceAtSalon")}
      />
      <StatCard
        icon={Repeat}
        label="From returning clients"
        value={peso(money.returningRevenue.value)}
        change={describeChange(money.returningRevenue.value, money.returningRevenue.previous)}
        hint={`${share}from clients who visited before`}
        sparkline={line("From returning clients", "returningRevenue")}
      />
      <StatCard
        icon={CalendarClock}
        label="Booked ahead"
        value={peso(money.bookedAhead.value)}
        change={describeChange(money.bookedAhead.value, money.bookedAhead.previous)}
        hint={visits(money.bookedAhead.visits)}
        sparkline={aheadLine}
      />
      <StatCard
        icon={CircleSlash}
        label="Lost to cancellations"
        value={peso(money.lostToCancellations.value)}
        change={describeChange(money.lostToCancellations.value, money.lostToCancellations.previous)}
        hint="list price of cancelled and refunded visits"
        lowerIsBetter
        sparkline={line("Lost to cancellations", "lost")}
      />
    </section>
  );
}
