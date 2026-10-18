import { Card } from "@/components/atoms";
import { describeChange, describePoints, peso, percent } from "@/lib/dashboardFormat";
import type { DashboardResponse, Utilization } from "@/services/dashboardTypes";
import ArtistUtilization from "@/components/features/admin/dashboard/ArtistUtilization";
import KpiCards from "@/components/features/admin/dashboard/KpiCards";
import { StatCard, SectionHeader } from "@/components/molecules";
import RankedBars from "@/components/features/admin/dashboard/RankedBars";
import { ViewBody, WEEKDAYS } from "@/components/features/admin/dashboard/dashboardParts";
import StatInfoTip from "@/components/features/admin/dashboard/StatInfoTip";

interface PerformanceViewProps {
  data: DashboardResponse;
  loading?: boolean;
  failed?: boolean;
  /** Loads artist utilization for the week holding a date; the card is left out without it */
  loadUtilization?: (date: string) => Promise<Utilization>;
}

// The Performance page: how the salon is doing with its clients and its team. The visits done in
// the period (collected, sales, bookings, returning clients), the key rates, how full each artist's week is, and when and with whom clients book.
export default function PerformanceView({ data, loading, failed, loadUtilization }: PerformanceViewProps) {
  const { rates } = data;
  return (
    <ViewBody loading={loading} failed={failed}>
      <KpiCards kpis={data.kpis} trend={data.trend} />

      <section aria-label="Key rates" className="grid grid-cols-2 gap-x-6 gap-y-6 rounded-2xl border border-crimson-light/40 bg-milk p-6 shadow-petal sm:grid-cols-4">
        <StatCard variant="bare" label="Cancellation rate" info={<StatInfoTip label="Cancellation rate" which="cancellationRate" />} value={percent(rates.cancellation.value)} change={describePoints(rates.cancellation.value, rates.cancellation.previous)} lowerIsBetter />
        <StatCard variant="bare" label="Booking conversion" info={<StatInfoTip label="Booking conversion" which="bookingConversion" />} value={percent(rates.conversion.value)} change={describePoints(rates.conversion.value, rates.conversion.previous)} hint="started bookings that were paid" />
        <StatCard variant="bare" label="Lead conversion" info={<StatInfoTip label="Lead conversion" which="leadConversion" />} value={percent(rates.leadConversion.value)} change={describePoints(rates.leadConversion.value, rates.leadConversion.previous)} hint={data.leads.accounts === 0 ? "new accounts that booked" : `${data.leads.booked} of ${data.leads.accounts} new accounts booked`} />
        <StatCard variant="bare" label="Repeat rate" info={<StatInfoTip label="Repeat rate" which="repeatRate" />} value={percent(rates.returning.value)} change={describePoints(rates.returning.value, rates.returning.previous)} hint="of this period's clients had come before" />
        <StatCard variant="bare" label="Average sale" info={<StatInfoTip label="Average sale" which="averageSale" />} value={rates.averageSale.value === null ? "–" : peso(rates.averageSale.value)} change={describeChange(rates.averageSale.value, rates.averageSale.previous)} hint="per completed visit" />
        <StatCard variant="bare" label="Client lifetime value" info={<StatInfoTip label="Client lifetime value" which="lifetimeValue" />} value={data.clientBase.lifetimeValue === null ? "–" : peso(data.clientBase.lifetimeValue)} hint="average spent per client so far" />
        <StatCard variant="bare" label="Churn" info={<StatInfoTip label="Churn" which="churn" />} value={percent(data.clientBase.churn)} hint={`${data.lapsedClients} of ${data.clientBase.clients} clients, no visit in 60 days`} />
        <StatCard variant="bare" label="Loyalty" info={<StatInfoTip label="Loyalty" which="loyalty" />} value={`${data.loyalty.stamps} / ${data.loyalty.redeemed}`} hint="stamps given / rewards redeemed" />
      </section>

      {loadUtilization && <ArtistUtilization load={loadUtilization} />}

      <div className="grid grid-cols-1 gap-3 md:gap-6 xl:grid-cols-2">
        <Card as="section" aria-label="Busiest weekdays" className="flex min-w-0 flex-col gap-3"><SectionHeader size="card" title="Busiest weekdays" />
          <RankedBars title="Bookings by weekday" rows={data.weekdays.map((w) => ({ label: WEEKDAYS[w.weekday - 1], value: w.bookings }))} emptyText="Nothing to show yet." />
        </Card>
        <Card as="section" aria-label="Bookings per artist" className="flex min-w-0 flex-col gap-3"><SectionHeader size="card" title="Bookings per artist" />
          <RankedBars title="Bookings by artist" rows={data.artists.map((a) => ({ label: a.name, value: a.bookings }))} emptyText="Nothing to show yet." />
        </Card>
      </div>
    </ViewBody>
  );
}
