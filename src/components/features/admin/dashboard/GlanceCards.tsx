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
  /** false: no change pills (All time has nothing before it to compare with) */
  compare?: boolean;
}

// The salon at a glance, on the Dashboard, for the chosen period: client accounts with a visit
// completed with the booking tracker, the different services and artists booked, and the visits
// completed with the tracker. Each has a pill against the previous period (none on All time) and a
// small line of the same count within each day, week or month.
export default function GlanceCards({ totals, granularity = "day", compare = true }: GlanceCardsProps) {
  const points = totals.trend;
  const change = (c: { value: number; previous: number }) => (compare ? describeChange(c.value, c.previous) : undefined);
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
        icon={Users} label="Total clients" info={<StatInfoTip label="Total clients" which="totalClients" />} value={String(totals.clients.value)}
        change={change(totals.clients)} hint="with a visit done" sparkline={line("Clients with a visit done", "clients")}
      />
      <StatCard
        icon={Gem} label="Total services" info={<StatInfoTip label="Total services" which="services" />} value={String(totals.services.value)}
        change={change(totals.services)} hint="booked" sparkline={line("Different services booked", "services")}
      />
      <StatCard
        icon={Palette} label="Artists" info={<StatInfoTip label="Artists" which="artists" />} value={String(totals.artists.value)}
        change={change(totals.artists)} hint="with bookings" sparkline={line("Artists with bookings", "artists")}
      />
      <StatCard
        icon={CalendarCheck} label="Appointments" info={<StatInfoTip label="Appointments" which="appointments" />} value={String(totals.appointments.value)}
        change={change(totals.appointments)} hint="confirmed and completed visits" sparkline={line("Visits completed", "appointments")}
      />
    </section>
  );
}
