import { CalendarClock, CircleSlash, HandCoins, Repeat } from "lucide-react";
import { describeChange, peso } from "../lib/dashboardFormat";
import { formatBucketLabel, granularityWord, type DayValues, type Trend } from "../lib/dashboardTrend";
import type { Money } from "../types";
import KpiCard from "./KpiCard";
import Sparkline from "./Sparkline";

const visits = (n: number) => `${n} confirmed ${n === 1 ? "visit" : "visits"} from today`;

interface MoneyCardsProps {
  money: Money;
  /** The period's estimated sales, for the returning clients' share of it */
  revenue?: number;
  /** The period day by day (or week, or month), for the cards' lines */
  trend?: Trend;
}

// Money worked out from list prices and downpayments, so it needs nothing entered by hand. Each
// card has a small line like the stat cards: over the period, except Booked ahead, which looks
// forward over the next days.
export default function MoneyCards({ money, revenue = 0, trend }: MoneyCardsProps) {
  const share = revenue > 0 ? `${Math.round((money.returningRevenue.value / revenue) * 100)}% of estimated sales, ` : "";

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
  const days = money.bookedAhead.days;
  const aheadLine =
    days.length === 0 ? undefined : (
      <Sparkline
        values={days.map((d) => d.value)}
        labels={days.map((d) => `${formatBucketLabel("day", d.date)}: ${peso(d.value)}`)}
        ariaLabel={`Booked ahead per day for the next ${days.length} days, from ${peso(days[0].value)} to ${peso(days[days.length - 1].value)}`}
      />
    );

  return (
    <section aria-label="Money" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
      <KpiCard
        icon={HandCoins}
        label="Balance at the salon"
        value={peso(money.balanceAtSalon.value)}
        change={describeChange(money.balanceAtSalon.value, money.balanceAtSalon.previous)}
        hint="estimated: list price minus downpayments"
        sparkline={line("Balance at the salon", "balanceAtSalon")}
      />
      <KpiCard
        icon={Repeat}
        label="From returning clients"
        value={peso(money.returningRevenue.value)}
        change={describeChange(money.returningRevenue.value, money.returningRevenue.previous)}
        hint={`${share}from clients who visited before`}
        sparkline={line("From returning clients", "returningRevenue")}
      />
      <KpiCard icon={CalendarClock} label="Booked ahead" value={peso(money.bookedAhead.value)} hint={visits(money.bookedAhead.visits)} sparkline={aheadLine} />
      <KpiCard
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
