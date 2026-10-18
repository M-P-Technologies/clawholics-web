import { timeRangeLabel } from "@/lib/timeFormat";
import { Card } from "@/components/atoms";
import { ArrowRight } from "lucide-react";
import { shortDay } from "@/lib/dashboardFormat";
import { Link } from "@/lib/router";
import type { BookingsLoader } from "@/hooks/admin/useReports";
import { useQueueRows } from "@/hooks/admin/useQueueRows";
import type { DashboardResponse, AttentionResponse, AttentionTab } from "@/services/dashboardTypes";
import ActiveBookings from "@/components/features/admin/dashboard/ActiveBookings";
import BarChart from "@/components/features/admin/dashboard/BarChart";
import BookingsTable from "@/components/features/admin/dashboard/BookingsTable";
import NeedsAttentionQueue from "@/components/features/admin/dashboard/NeedsAttentionQueue";
import DonutChart from "@/components/features/admin/dashboard/DonutChart";
import { SectionHeader } from "@/components/molecules";
import SalonNotes from "@/components/features/admin/dashboard/SalonNotes";
import GlanceCards from "@/components/features/admin/dashboard/GlanceCards";
import { OTHER_COLOR, SERIES_COLORS, STACK_COLORS } from "@/components/features/admin/dashboard/chartColors";
import { ViewBody } from "@/components/features/admin/dashboard/dashboardParts";
import { formatAxisLabel, formatBucketLabel } from "@/lib/dashboardTrend";

interface DashboardViewProps {
  data: DashboardResponse;
  loading?: boolean;
  failed?: boolean;
  /** Loads the admin appointments list for the bookings table and today's bookings; without it
   * the short next-appointments list from `data` is shown */
  loadBookings?: BookingsLoader;
  /** Loads the queue of what to act on, which takes the bookings table's place */
  loadAttention?: (tab: AttentionTab) => Promise<AttentionResponse>;
}

const MORE = [
  { to: "/sales", label: "Sales", hint: "money, top services and the sales record" },
  { to: "/performance", label: "Performance", hint: "key rates, artist utilization and weekdays" },
];

// Everything below the title row: only what the salon checks every day. The salon at a glance
// (clients, services, artists, confirmed appointments), the notes and today's bookings, two charts and the bookings table; the rest is on the
// Sales and Performance pages. Pure: it only draws the data it is given, so the layout can be
// previewed and tested without signing in.
export default function DashboardView({ data, loading = false, failed = false, loadBookings, loadAttention }: DashboardViewProps) {
  // The queue shows as many rows as keep its column level with the notes beside it
  const { columnRef, besideRef, rows } = useQueueRows();
  // All time has nothing before it to compare with: no change pills then
  const compare = data.range !== "all";
  // The bookings chart: a short date under each bar pair, the full one in its tooltip
  const bars = data.bookingsTrend;
  const years = new Set(bars.points.map((b) => b.date.slice(0, 4))).size > 1;
  const barData = bars.points.map((b) => ({
    label: formatAxisLabel(bars.granularity, b.date, years),
    title: formatBucketLabel(bars.granularity, b.date),
    a: b.completed,
    b: b.cancelled,
  }));
  const serviceSlices = data.overview.services.map((s, i) => ({
    label: s.name,
    value: s.bookings,
    color: s.name === "Other" ? OTHER_COLOR : SERIES_COLORS[i % SERIES_COLORS.length],
  }));

  return (
    <ViewBody loading={loading} failed={failed}>
      <GlanceCards totals={data.totals} granularity={data.trend.granularity} compare={compare} />

      {/* Words on the right, figures on the left. On a phone the notes come straight after the
          stat cards; from lg up they take one column of the same four-column grid as the stat cards, so
          they are exactly one card wide, and stay in view while the charts scroll. */}
      <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-3 lg:items-start">
        <div ref={besideRef} className="flex flex-col gap-3 md:gap-6 lg:sticky lg:top-0 lg:order-last">
          <SalonNotes data={data} />
          {loadBookings && <ActiveBookings load={loadBookings} />}
        </div>

        <div ref={columnRef} className="flex min-w-0 flex-col gap-3 md:gap-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:gap-6 xl:grid-cols-2">
            <Card as="section" aria-label="Bookings over time" className="flex min-w-0 flex-col gap-3"><SectionHeader size="card" title="Bookings over time" />
              <BarChart
                title="Bookings over time"
                data={barData}
                aLabel="Completed"
                bLabel="Cancelled"
                aColor={STACK_COLORS.done}
                bColor={STACK_COLORS.lost}
                emptyText="No bookings in this period yet."
              />
            </Card>

            <Card as="section" aria-label="Service mix" className="flex min-w-0 flex-col gap-3"><SectionHeader size="card" title="Service mix" />
              <DonutChart title="Service mix" slices={serviceSlices} centerLabel="bookings" emptyText="No bookings yet." />
            </Card>
          </div>

          {loadAttention ? (
            <NeedsAttentionQueue load={loadAttention} rows={rows} />
          ) : loadBookings ? (
            <BookingsTable load={loadBookings} />
          ) : (
            <Card as="section" aria-label="Next appointments" className="flex min-w-0 flex-col gap-3"><SectionHeader size="card" title="Next appointments" />
              {data.next.length === 0 ? (
                <p className="text-sm text-gray-red">No upcoming confirmed appointments.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  <ul className="flex flex-col gap-3">
                    {data.next.map((item) => (
                      <li key={item.id} className="flex items-start gap-3 rounded-2xl bg-crimson-light/20 px-3 py-3">
                        <span className="w-28 shrink-0 text-[13px] text-gray-red">
                          <span className="block font-display text-base text-berry">{shortDay(item.appointment_date)}</span>
                          {timeRangeLabel(item.appointment_time)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-bold text-gray-red">{item.client_name}</span>
                          <span className="block truncate text-[13px] text-gray-red">{item.service_name} · {item.nailist_name}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/schedule" className="self-start text-sm font-bold text-berry underline decoration-crimson-light underline-offset-4">
                    Open the schedule
                  </Link>
                </div>
              )}
            </Card>
          )}

          {/* Where the other numbers went */}
          <nav aria-label="More numbers" className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6">
            {MORE.map((m) => (
              <Link
                key={m.to}
                to={m.to}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-crimson-light/40 bg-milk px-6 py-3 shadow-petal transition-colors hover:bg-crimson-light/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
              >
                <span className="min-w-0">
                  <span className="block font-display text-lg text-gray-red">{m.label}</span>
                  <span className="block text-xs text-gray-red">{m.hint}</span>
                </span>
                <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crimson-light/40 text-berry transition-transform group-hover:translate-x-0.5">
                  <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </ViewBody>
  );
}
