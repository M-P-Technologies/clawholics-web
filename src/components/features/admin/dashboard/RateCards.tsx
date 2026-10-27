import { CalendarX, CreditCard, Repeat, UserPlus } from "lucide-react";
import { describePoints, percent } from "@/lib/dashboardFormat";
import { formatBucketLabel, granularityWord, type Granularity } from "@/lib/dashboardTrend";
import type { DashboardResponse } from "@/services/dashboardTypes";
import { StatCard } from "@/components/molecules";
import Sparkline from "@/components/features/admin/dashboard/Sparkline";
import StatInfoTip from "@/components/features/admin/dashboard/StatInfoTip";

interface RateCardsProps {
  rates: DashboardResponse["rates"];
  leads: DashboardResponse["leads"];
  /** Each rate so far in the period, a point per day, week or month */
  rateTrend: DashboardResponse["rateTrend"];
  /** What each point of `rateTrend` covers */
  granularity?: Granularity;
  /** false: no change pills (All time has nothing before it to compare with) */
  compare?: boolean;
}

type RateKey = Exclude<keyof DashboardResponse["rateTrend"][number], "date">;

// The Performance page's key rates, each against the previous period in percentage points: the
// visits that didn't happen, started bookings that were paid, new accounts that booked, and the
// period's clients who had come before. Each has a small line of the rate so far in the period.
// The money is on the Sales page.
export default function RateCards({ rates, leads, rateTrend, granularity = "day", compare = true }: RateCardsProps) {
  const change = (r: { value: number | null; previous: number | null }) => (compare ? describePoints(r.value, r.previous) : undefined);
  const line = (label: string, key: RateKey) => {
    const known = rateTrend.map((p) => p[key]);
    const first = known.find((v) => v !== null);
    if (first === undefined || first === null) return undefined;
    // Before there's anything to divide by, the line starts level with the first rate; after, a
    // point with nothing new keeps the rate so far
    let last = first;
    const values = known.map((v) => (last = v ?? last) * 100);
    return (
      <Sparkline
        values={values}
        labels={rateTrend.map((p, i) => `${formatBucketLabel(granularity, p.date)}: ${percent(known[i])}`)}
        ariaLabel={`${label} ${granularityWord(granularity)}, from ${percent(first)} to ${percent(values[values.length - 1] / 100)}`}
      />
    );
  };

  return (
    <section aria-label="Key rates" className="grid grid-cols-2 gap-3 md:gap-6 xl:grid-cols-4">
      <StatCard
        icon={CalendarX} label="Cancellation rate" info={<StatInfoTip label="Cancellation rate" which="cancellationRate" />}
        value={percent(rates.cancellation.value)} change={change(rates.cancellation)} lowerIsBetter
        hint="visits that didn't happen" sparkline={line("Cancellation rate", "cancellation")}
      />
      <StatCard
        icon={CreditCard} label="Booking conversion" info={<StatInfoTip label="Booking conversion" which="bookingConversion" />}
        value={percent(rates.conversion.value)} change={change(rates.conversion)}
        hint="started bookings that were paid" sparkline={line("Booking conversion", "conversion")}
      />
      <StatCard
        icon={UserPlus} label="Lead conversion" info={<StatInfoTip label="Lead conversion" which="leadConversion" />}
        value={percent(rates.leadConversion.value)} change={change(rates.leadConversion)}
        hint={leads.accounts === 0 ? "new accounts that booked" : `${leads.booked} of ${leads.accounts} new accounts booked`}
        sparkline={line("Lead conversion", "leadConversion")}
      />
      <StatCard
        icon={Repeat} label="Repeat rate" info={<StatInfoTip label="Repeat rate" which="repeatRate" />}
        value={percent(rates.returning.value)} change={change(rates.returning)}
        hint="of this period's clients had come before" sparkline={line("Repeat rate", "returning")}
      />
    </section>
  );
}
