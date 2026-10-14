import { describeChange, describePoints, peso, percent } from "../../../lib/dashboardFormat";
import type { DashboardResponse, Utilization } from "../../../services/dashboardTypes";
import ArtistUtilization from "./ArtistUtilization";
import GlanceCards from "./GlanceCards";
import { StatCard } from "@/components/molecules";
import RankedBars from "./RankedBars";
import { Panel, ViewBody, WEEKDAYS } from "./dashboardParts";

interface PerformanceViewProps {
  data: DashboardResponse;
  loading?: boolean;
  failed?: boolean;
  /** Loads artist utilization for the week holding a date; the card is left out without it */
  loadUtilization?: (date: string) => Promise<Utilization>;
}

// The Performance page: how the salon is doing with its clients and its team. The salon's size,
// the key rates, how full each artist's week is, and when and with whom clients book.
export default function PerformanceView({ data, loading, failed, loadUtilization }: PerformanceViewProps) {
  const { rates } = data;
  return (
    <ViewBody loading={loading} failed={failed}>
      <GlanceCards totals={data.totals} granularity={data.trend.granularity} upcomingDays={data.money.bookedAhead.days} />

      <section aria-label="Key rates" className="grid grid-cols-2 gap-x-5 gap-y-6 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal sm:grid-cols-4">
        <StatCard variant="bare" label="Cancellation rate" value={percent(rates.cancellation.value)} change={describePoints(rates.cancellation.value, rates.cancellation.previous)} lowerIsBetter />
        <StatCard variant="bare" label="Booking conversion" value={percent(rates.conversion.value)} change={describePoints(rates.conversion.value, rates.conversion.previous)} hint="started bookings that were paid" />
        <StatCard variant="bare" label="Lead conversion" value={percent(rates.leadConversion.value)} change={describePoints(rates.leadConversion.value, rates.leadConversion.previous)} hint={data.leads.accounts === 0 ? "new accounts that booked" : `${data.leads.booked} of ${data.leads.accounts} new accounts booked`} />
        <StatCard variant="bare" label="Returning clients" value={percent(rates.returning.value)} change={describePoints(rates.returning.value, rates.returning.previous)} hint="of clients who visited" />
        <StatCard variant="bare" label="Average sale" value={rates.averageSale.value === null ? "–" : peso(rates.averageSale.value)} change={describeChange(rates.averageSale.value, rates.averageSale.previous)} hint="per completed visit" />
        <StatCard variant="bare" label="Client lifetime value" value={data.clientBase.lifetimeValue === null ? "–" : peso(data.clientBase.lifetimeValue)} hint="average spent per client so far" />
        <StatCard variant="bare" label="Churn" value={percent(data.clientBase.churn)} hint={`${data.lapsedClients} of ${data.clientBase.clients} clients, no visit in 60 days`} />
        <StatCard variant="bare" label="Loyalty" value={`${data.loyalty.stamps} / ${data.loyalty.redeemed}`} hint="stamps given / rewards redeemed" />
      </section>

      {loadUtilization && <ArtistUtilization load={loadUtilization} />}

      <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
        <Panel title="Busiest weekdays">
          <RankedBars title="Bookings by weekday" rows={data.weekdays.map((w) => ({ label: WEEKDAYS[w.weekday - 1], value: w.bookings }))} emptyText="Nothing to show yet." />
        </Panel>
        <Panel title="Bookings per artist">
          <RankedBars title="Bookings by artist" rows={data.artists.map((a) => ({ label: a.name, value: a.bookings }))} emptyText="Nothing to show yet." />
        </Panel>
      </div>
    </ViewBody>
  );
}
