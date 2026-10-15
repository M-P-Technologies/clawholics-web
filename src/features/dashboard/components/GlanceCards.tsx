import { ArrowRight, CalendarCheck, Gem, Palette, Users, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formatBucketLabel, granularityWord, type Granularity } from "../lib/dashboardTrend";
import { Link } from "../../../lib/router";
import type { DashboardResponse, Money } from "../types";
import Sparkline from "./Sparkline";

interface Glance {
  label: string;
  value: number;
  hint: string;
  to: string;
  linkLabel: string;
  icon: LucideIcon;
  line?: ReactNode;
}

interface GlanceCardsProps {
  totals: DashboardResponse["totals"];
  /** What each point of `totals.trend` covers */
  granularity?: Granularity;
  /** The next days' confirmed visits, for the Appointments line */
  upcomingDays?: Money["bookedAhead"]["days"];
}

// The salon's size at a glance: how many clients, services, artists and appointments still to
// do. Counts as of today, so they don't follow the period; each card opens its screen. Drawn
// like the stat cards (KpiCard), with an arrow to the screen in place of the change pill, and a
// small line: clients over the period, the services and artists booked in it, and the visits
// still to come in the next days.
export default function GlanceCards({ totals, granularity = "day", upcomingDays = [] }: GlanceCardsProps) {
  const points = totals.trend;
  const line = (label: string, key: "clients" | "services" | "artists") =>
    points.length === 0 ? undefined : (
      <Sparkline
        values={points.map((p) => p[key])}
        labels={points.map((p) => `${formatBucketLabel(granularity, p.date)}: ${p[key]}`)}
        ariaLabel={`${label} ${granularityWord(granularity)}, from ${points[0][key]} to ${points[points.length - 1][key]}`}
      />
    );
  const upcomingLine =
    upcomingDays.length === 0 ? undefined : (
      <Sparkline
        values={upcomingDays.map((d) => d.visits)}
        labels={upcomingDays.map((d) => `${formatBucketLabel("day", d.date)}: ${d.visits}`)}
        ariaLabel={`Upcoming appointments per day for the next ${upcomingDays.length} days, from ${upcomingDays[0].visits} to ${upcomingDays[upcomingDays.length - 1].visits}`}
      />
    );

  const cards: Glance[] = [
    { label: "Total clients", value: totals.clients, hint: "client accounts", to: "/clients#clients", linkLabel: "Open clients", icon: Users, line: line("Total clients", "clients") },
    { label: "Services", value: totals.services, hint: "on the menu", to: "/nail-services", linkLabel: "Open services", icon: Gem, line: line("Different services booked", "services") },
    { label: "Artists", value: totals.artists, hint: "nail artists", to: "/nail-artists", linkLabel: "Open artists", icon: Palette, line: line("Artists with bookings", "artists") },
    { label: "Appointments", value: totals.upcoming, hint: "upcoming, confirmed", to: "/clients?status=CONFIRMED", linkLabel: "Open appointments", icon: CalendarCheck, line: upcomingLine },
  ];

  return (
    <section aria-label="Salon at a glance" className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
      {cards.map(({ label, value, hint, to, linkLabel, icon: Icon, line: cardLine }) => (
        <div
          key={label}
          role="group"
          aria-label={label}
          className="relative flex min-w-0 flex-col gap-2 rounded-2xl border border-crimson-light/40 bg-milk p-4 shadow-petal sm:p-5"
        >
          <span
            data-testid="kpi-icon"
            aria-hidden="true"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-crimson-light/40 text-berry sm:right-4 sm:top-4 sm:h-10 sm:w-10 lg:h-8 lg:w-8 xl:h-10 xl:w-10"
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-4 lg:w-4 xl:h-5 xl:w-5" strokeWidth={1.75} />
          </span>
          <p className="pr-10 text-[13px] font-medium text-gray-red/80">{label}</p>
          <p className="break-words font-display text-3xl leading-none text-berry sm:text-4xl lg:text-3xl xl:text-4xl">{value}</p>
          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="min-w-0 text-[12px] leading-snug text-gray-red/70">{hint}</p>
            <Link
              to={to}
              aria-label={linkLabel}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-crimson-light/40 text-berry transition-colors hover:bg-berry hover:text-pearl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
            >
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {cardLine && <div className="mt-auto pt-2">{cardLine}</div>}
        </div>
      ))}
    </section>
  );
}
