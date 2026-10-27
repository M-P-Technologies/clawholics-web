import { SectionHeader } from "@/components/molecules";
import { Card } from "@/components/atoms";
import { peso } from "@/lib/dashboardFormat";
import type { DashboardResponse } from "@/services/dashboardTypes";
import MoneyCards from "@/components/features/admin/dashboard/MoneyCards";
import RankedBars from "@/components/features/admin/dashboard/RankedBars";
import SalesRecord from "@/components/features/admin/dashboard/SalesRecord";
import { BAR_COLOR, STATUS_COLORS } from "@/components/features/admin/dashboard/chartColors";
import { ViewBody } from "@/components/features/admin/dashboard/dashboardParts";

interface SalesViewProps {
  data: DashboardResponse;
  loading?: boolean;
  failed?: boolean;
}

// The Sales page: where the money came from in the period. The money cards, what sold best and
// how bookings ended, then every completed visit in the sales record.
export default function SalesView({ data, loading, failed }: SalesViewProps) {
  return (
    <ViewBody loading={loading} failed={failed}>
      <MoneyCards money={data.money} granularity={data.trend.granularity} compare={data.range !== "all"} />

      <div className="grid grid-cols-1 gap-3 md:gap-6 xl:grid-cols-2">
        <Card as="section" aria-label="Top services" className="flex min-w-0 flex-col gap-3"><SectionHeader size="card" title="Top services" />
          <RankedBars
            title="Top services"
            rows={data.services.map((s) => ({ label: s.name, value: s.bookings, valueLabel: `${s.bookings} · ${peso(s.estimatedSales)}`, color: BAR_COLOR }))}
            emptyText="Nothing to show yet."
          />
        </Card>

        <Card as="section" aria-label="How bookings ended" className="flex min-w-0 flex-col gap-3"><SectionHeader size="card" title="How bookings ended" />
          <RankedBars
            title="Appointments by status"
            rows={[
              { label: "Completed", value: data.outcomes.completed, color: STATUS_COLORS.completed },
              { label: "Confirmed", value: data.outcomes.confirmed, color: STATUS_COLORS.confirmed },
              { label: "Waiting for payment", value: data.outcomes.pending, color: STATUS_COLORS.pending },
              { label: "Cancelled", value: data.outcomes.cancelled, color: STATUS_COLORS.cancelled },
              { label: "Refunded", value: data.outcomes.refunded, color: STATUS_COLORS.refunded },
            ]}
            emptyText="Nothing to show yet."
          />
        </Card>
      </div>

      <SalesRecord sales={data.sales} />
    </ViewBody>
  );
}
