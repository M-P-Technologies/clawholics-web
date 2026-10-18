import { CalendarCheck, Gem, Palette, Users } from "lucide-react";
import { describeChange } from "@/lib/dashboardFormat";
import { formatBucketLabel, granularityWord, type Granularity } from "@/lib/dashboardTrend";
import type { DashboardResponse } from "@/services/dashboardTypes";
import { StatCard } from "@/components/molecules";
import Sparkline from "@/components/features/admin/dashboard/Sparkline";
import StatInfoTip from "@/components/features/admin/dashboard/StatInfoTip";

interface GlanceCardsProps {
  totals: DashboardResponse["totals"];
  /** What each point of `totals.trend` covers */
  granularity?: Granularity;
}

// The salon at a glance, on the Dashboard: as of today, its clients (with a completed appointment),
// the services and artists on the public pages, and the visits completed with the tracker. Each
// has a growth pill: clients and visits against the count at the end of last month, services and
// artists by how many different ones were booked this month against last; and a small line over the
// period: clients, the services and artists booked, and the visits completed.
export default function GlanceCards({ totals, granularity = "day" }: GlanceCardsProps) {
  const points = totals.trend;
  const { growth } = totals;
  const line = (label: string, key: "clients" | "services" | "artists" | "appointments") =>
    points.length === 0 ? undefined : (
      <Sparkline
        values={points.map((p) => p[key])}
        labels={points.map((p) => `${formatBucketLabel(granularity, p.date)}: ${p[key]}`)}
        ariaLabel={`${label} ${granularityWord(granularity)}, from ${points[0][key]} to ${points[points.length - 1][key]}`}
      />
    );

  return (
    <section aria-label="Salon at a glance" className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
      <StatCard
        icon={Users} label="Total clients" info={<StatInfoTip label="Total clients" which="totalClients" />} value={String(totals.clients)}
        change={describeChange(totals.clients, growth.clients)} hint="confirmed and completed" sparkline={line("Total clients", "clients")}
      />
      <StatCard
        icon={Gem} label="Total services" info={<StatInfoTip label="Total services" which="services" />} value={String(totals.services)}
        change={describeChange(growth.servicesBooked.value, growth.servicesBooked.previous)} hint="on the Services page" sparkline={line("Different services booked", "services")}
      />
      <StatCard
        icon={Palette} label="Artists" info={<StatInfoTip label="Artists" which="artists" />} value={String(totals.artists)}
        change={describeChange(growth.artistsBooked.value, growth.artistsBooked.previous)} hint="on the Artists page" sparkline={line("Artists with bookings", "artists")}
      />
      <StatCard
        icon={CalendarCheck} label="Appointments" info={<StatInfoTip label="Appointments" which="appointments" />} value={String(totals.appointments)}
        change={describeChange(totals.appointments, growth.appointments)} hint="confirmed and completed visits" sparkline={line("Appointments completed", "appointments")}
      />
    </section>
  );
}
