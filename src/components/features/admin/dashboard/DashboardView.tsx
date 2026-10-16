import { Card } from "@/components/atoms";
import { ArrowRight, CalendarHeart, Receipt, UserPlus, Wallet } from "lucide-react";
import { describeChange, peso, shortDay } from "@/lib/dashboardFormat";
import { formatBucketLabel, granularityWord, type DayValues } from "@/lib/dashboardTrend";
import { Link } from "@/lib/router";
import type { BookingsLoader } from "@/hooks/admin/useReports";
import type { DashboardResponse } from "@/services/dashboardTypes";
import ActiveBookings from "@/components/features/admin/dashboard/ActiveBookings";
import BarChart from "@/components/features/admin/dashboard/BarChart";
import BookingsTable from "@/components/features/admin/dashboard/BookingsTable";
import DonutChart from "@/components/features/admin/dashboard/DonutChart";
import { StatCard, SectionHeader } from "@/components/molecules";
import SalonNotes from "@/components/features/admin/dashboard/SalonNotes";
import Sparkline from "@/components/features/admin/dashboard/Sparkline";
import { OTHER_COLOR, SERIES_COLORS, STACK_COLORS } from "@/components/features/admin/dashboard/chartColors";
import { ViewBody, monthName } from "@/components/features/admin/dashboard/dashboardParts";

interface DashboardViewProps {
  data: DashboardResponse;
  loading?: boolean;
  failed?: boolean;
  /** Loads the admin appointments list for the bookings table and today's bookings; without it
   * the short next-appointments list from `data` is shown */
  loadBookings?: BookingsLoader;
}

const MORE = [
  { to: "/sales", label: "Sales", hint: "money, top services and the sales record" },
  { to: "/performance", label: "Performance", hint: "key rates, artist utilization and weekdays" },
];

// Everything below the title row: only what the salon checks every day. The four headline
// numbers, the notes and today's bookings, two charts and the bookings table; the rest is on the
// Sales and Performance pages. Pure: it only draws the data it is given, so the layout can be
// previewed and tested without signing in.
export default function DashboardView({ data, loading = false, failed = false, loadBookings }: DashboardViewProps) {
  const { kpis } = data;
  const { granularity, points } = data.trend;

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
  const serviceSlices = data.services.map((s, i) => ({
    label: s.name,
    value: s.bookings,
    color: s.name === "Other" ? OTHER_COLOR : SERIES_COLORS[i % SERIES_COLORS.length],
  }));

  return (
    <ViewBody loading={loading} failed={failed}>
      <div className="grid grid-cols-2 gap-3 md:gap-6 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Collected" value={peso(kpis.collected.value)} change={describeChange(kpis.collected.value, kpis.collected.previous)} hint="downpayments received" sparkline={spark("Collected", "collected", peso)} />
        <StatCard icon={Receipt} label="Estimated sales" value={peso(kpis.estimatedSales.value)} change={describeChange(kpis.estimatedSales.value, kpis.estimatedSales.previous)} hint="list price of completed services" sparkline={spark("Estimated sales", "estimatedSales", peso)} />
        <StatCard icon={CalendarHeart} label="Bookings" value={String(kpis.bookings.value)} change={describeChange(kpis.bookings.value, kpis.bookings.previous)} hint="confirmed and completed" sparkline={spark("Bookings", "bookings", String)} />
        <StatCard icon={UserPlus} label="New clients" value={String(kpis.newClients.value)} change={describeChange(kpis.newClients.value, kpis.newClients.previous)} hint="new accounts" sparkline={spark("New clients", "newClients", String)} />
      </div>

      {/* Words on the right, figures on the left. On a phone the notes come straight after the
          stat cards; from lg up they take one column of the same four-column grid as the stat cards, so
          they are exactly one card wide, and stay in view while the charts scroll. */}
      <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-3 md:gap-6 lg:sticky lg:top-0 lg:order-last">
          <SalonNotes data={data} />
          {loadBookings && <ActiveBookings load={loadBookings} />}
        </div>

        <div className="flex min-w-0 flex-col gap-3 md:gap-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:gap-6 xl:grid-cols-2">
            <Card as="section" aria-label="Bookings per month" className="flex min-w-0 flex-col gap-3"><SectionHeader size="card" title="Bookings per month" />
              <BarChart
                title="Bookings per month"
                data={data.monthly.map((m) => ({ label: monthName(m.month), a: m.completed, b: m.cancelled }))}
                aLabel="Completed"
                bLabel="Cancelled"
                aColor={STACK_COLORS.done}
                bColor={STACK_COLORS.lost}
                emptyText="No bookings in these months yet."
              />
            </Card>

            <Card as="section" aria-label="Service mix" className="flex min-w-0 flex-col gap-3"><SectionHeader size="card" title="Service mix" />
              <DonutChart title="Service mix" slices={serviceSlices} centerLabel="bookings" emptyText="No bookings in this period." />
            </Card>
          </div>

          {loadBookings ? (
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
                          {item.appointment_time}
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
