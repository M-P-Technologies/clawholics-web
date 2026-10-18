import { CalendarHeart, Receipt, Repeat, Wallet } from "lucide-react";
import { describeChange, peso } from "@/lib/dashboardFormat";
import { formatBucketLabel, granularityWord, type DayValues } from "@/lib/dashboardTrend";
import type { DashboardResponse } from "@/services/dashboardTypes";
import { StatCard } from "@/components/molecules";
import Sparkline from "@/components/features/admin/dashboard/Sparkline";
import StatInfoTip from "@/components/features/admin/dashboard/StatInfoTip";

interface KpiCardsProps {
  kpis: DashboardResponse["kpis"];
  trend: DashboardResponse["trend"];
}

// The period's visits done with the booking tracker: what was collected and sold, how many, and the
// returning clients. Each card has a small line over the period.
export default function KpiCards({ kpis, trend }: KpiCardsProps) {
  const { granularity, points } = trend;

  // A small line for one measure: a point per day, week or month, named in its tooltip and
  // described in words for screen readers
  const spark = (label: string, key: keyof DayValues, format: (n: number) => string) => {
    if (points.length === 0) return undefined;
    const values = points.map((p) => p[key]);
    return (
      <Sparkline
        values={values}
        labels={points.map((p) => `${formatBucketLabel(granularity, p.date)}: ${format(p[key])}`)}
        ariaLabel={`${label} ${granularityWord(granularity)}, from ${format(values[0])} to ${format(values[values.length - 1])}`}
      />
    );
  };

  return (
    <section aria-label="Visits done" className="grid grid-cols-2 gap-3 md:gap-6 xl:grid-cols-4">
      <StatCard icon={Wallet} label="Collected" info={<StatInfoTip label="Collected" which="collected" />} value={peso(kpis.collected.value)} change={describeChange(kpis.collected.value, kpis.collected.previous)} hint="downpayments of done visits" sparkline={spark("Collected", "collected", peso)} />
      <StatCard icon={Receipt} label="Sales" info={<StatInfoTip label="Sales" which="sales" />} value={peso(kpis.estimatedSales.value)} change={describeChange(kpis.estimatedSales.value, kpis.estimatedSales.previous)} hint="downpayment + balance" sparkline={spark("Sales", "estimatedSales", peso)} />
      <StatCard icon={CalendarHeart} label="Bookings" info={<StatInfoTip label="Bookings" which="bookings" />} value={String(kpis.bookings.value)} change={describeChange(kpis.bookings.value, kpis.bookings.previous)} hint="confirmed and completed" sparkline={spark("Bookings", "bookings", String)} />
      <StatCard icon={Repeat} label="Returning clients" info={<StatInfoTip label="Returning clients" which="returningClients" />} value={String(kpis.recurringClients.value)} change={describeChange(kpis.recurringClients.value, kpis.recurringClients.previous)} hint="2 or more completed visits" sparkline={spark("Returning clients", "recurringClients", String)} />
    </section>
  );
}
