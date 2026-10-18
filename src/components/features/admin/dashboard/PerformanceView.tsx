import { Card } from "@/components/atoms";
import type { DashboardResponse, Utilization } from "@/services/dashboardTypes";
import ArtistUtilization from "@/components/features/admin/dashboard/ArtistUtilization";
import RateCards from "@/components/features/admin/dashboard/RateCards";
import { SectionHeader } from "@/components/molecules";
import RankedBars from "@/components/features/admin/dashboard/RankedBars";
import { ViewBody } from "@/components/features/admin/dashboard/dashboardParts";
import { busiestWeekdays } from "@/lib/dashboardFormat";

interface PerformanceViewProps {
  data: DashboardResponse;
  loading?: boolean;
  failed?: boolean;
  /** Loads artist utilization for the week holding a date; the card is left out without it */
  loadUtilization?: (date: string) => Promise<Utilization>;
}

// The Performance page: how the salon is doing with its clients and its team. The four key rates,
// how full each artist's week is, and when and with whom clients book. The money is on the Sales page.
export default function PerformanceView({ data, loading, failed, loadUtilization }: PerformanceViewProps) {
  return (
    <ViewBody loading={loading} failed={failed}>
      <RateCards rates={data.rates} leads={data.leads} rateTrend={data.rateTrend} granularity={data.trend.granularity} compare={data.range !== "all"} />

      {loadUtilization && <ArtistUtilization load={loadUtilization} />}

      <div className="grid grid-cols-1 gap-3 md:gap-6 xl:grid-cols-2">
        <Card as="section" aria-label="Busiest weekdays" className="flex min-w-0 flex-col gap-3"><SectionHeader size="card" title="Busiest weekdays" />
          <RankedBars title="Bookings by weekday" rows={busiestWeekdays(data.weekdays, data.artists.length)} emptyText="Nothing to show yet." />
        </Card>
        <Card as="section" aria-label="Bookings per artist" className="flex min-w-0 flex-col gap-3"><SectionHeader size="card" title="Bookings per artist" />
          <RankedBars title="Bookings by artist" rows={data.artists.map((a) => ({ label: a.name, value: a.bookings }))} emptyText="Nothing to show yet." />
        </Card>
      </div>
    </ViewBody>
  );
}
