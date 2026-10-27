import type { ReactNode } from "react";
import clsx from "clsx";
import { Skeleton } from "@/components/atoms";
import AdminShell from "../shell/AdminShell";
import { ListSkeleton } from "./ListSkeleton";

// The admin screens' loading placeholders: each is shaped like the screen it stands in for, with
// the same grids, breakpoints and gaps, inside the real AdminShell (sidebar and title), so the page
// doesn't jump when the data arrives. Each one is a single role="status" region named for what's
// loading; the bars themselves are hidden from screen readers.

/** A card like the screens' panels, holding placeholders */
function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("flex min-w-0 flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-6 shadow-petal", className)}>{children}</div>;
}

/** The whole screen's loading region, with its name read out once */
function Loading({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} className={clsx("flex min-h-0 flex-1 flex-col gap-3 overflow-hidden pb-2 md:gap-6", className)}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** A stat card (StatCard): its label and icon circle, the figure, the change, the hint and, on the
 *  report pages, the sparkline */
function StatCardSkeleton({ spark = false }: { spark?: boolean }) {
  return (
    <Card className="relative gap-3! p-3 sm:p-6">
      <Skeleton className="absolute right-3 top-3 h-8 w-8 rounded-full sm:right-4 sm:top-4 sm:h-10 sm:w-10 lg:h-8 lg:w-8 xl:h-10 xl:w-10" />
      <Skeleton className="h-3.5 w-24 max-w-[60%]" />
      <Skeleton className="h-7.5 w-20 sm:h-9 lg:h-7.5 xl:h-9" />
      {spark && <Skeleton className="h-5 w-16 rounded-full" />}
      <Skeleton className="h-3 w-32 max-w-full" />
      {spark && <Skeleton className="mt-1 h-10 w-full rounded-lg" />}
    </Card>
  );
}

/** A compact stat (StatCard size="compact"): a tinted box with the label, figure and hint */
function CompactStatSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-1.5 rounded-xl bg-crimson-light/15 p-3", className)}>
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-14" />
      <Skeleton className="h-3 w-24 max-w-full" />
    </div>
  );
}

/** A row of stat cards; `grid` is the real row's columns */
function StatsSkeleton({ count = 4, spark = false, grid = "grid-cols-2 lg:grid-cols-4" }: { count?: number; spark?: boolean; grid?: string }) {
  return (
    <div className={clsx("grid gap-3 md:gap-6", grid)}>
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={i} spark={spark} />
      ))}
    </div>
  );
}

/** Lines of text of varying width */
function LinesSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-2/3", "w-3/4"];
  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={clsx("h-3.5", i === lines - 1 ? "w-1/2" : widths[i % widths.length])} />
      ))}
    </div>
  );
}

/** A section's own loading area (a panel's notes, a drawer's proof), labelled for screen readers */
export function SectionSkeleton({ label, lines = 3, className }: { label: string; lines?: number; className?: string }) {
  return (
    <div role="status" aria-label={label} className={className}>
      <span className="sr-only">{label}…</span>
      <LinesSkeleton lines={lines} />
    </div>
  );
}

/** A card's title (SectionHeader size="card"), with an optional icon before it */
function CardTitle({ width = "w-40", icon = false }: { width?: string; icon?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {icon && <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
      <Skeleton className={clsx("h-5", width)} />
    </div>
  );
}

/** A panel with its title and grouped columns, like BarChart (with its legend) */
function BarChartPanelSkeleton() {
  const pairs = [
    ["h-[20%]", "h-[35%]"],
    ["h-[45%]", "h-[25%]"],
    ["h-[30%]", "h-[70%]"],
    ["h-[55%]", "h-[40%]"],
    ["h-[65%]", "h-[50%]"],
    ["h-[35%]", "h-[45%]"],
  ];
  return (
    <Card>
      <CardTitle />
      <div className="flex gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex h-44 items-end justify-around gap-3 border-b border-crimson-light/50 pb-px pl-6">
        {pairs.map(([a, b], i) => (
          <div key={i} className="flex h-full items-end gap-1">
            <Skeleton className={clsx("w-3 rounded-full", a)} />
            <Skeleton className={clsx("w-3 rounded-full", b)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** A panel with its title, a ring and its legend, like DonutChart */
function DonutPanelSkeleton() {
  return (
    <Card>
      <CardTitle width="w-32" />
      <div className="flex flex-1 flex-wrap items-center justify-center gap-6 py-3">
        <div className="h-36 w-36 shrink-0 rounded-full border-18 border-crimson-light/40 motion-safe:animate-pulse" />
        <div className="flex flex-col gap-3">
          {["w-28", "w-24", "w-32", "w-20"].map((width) => (
            <div key={width} className="flex items-center gap-3">
              <Skeleton className="h-2.5 w-2.5 rounded-full" />
              <Skeleton className={clsx("h-3", width)} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

/** A panel with its title and labelled bars, like RankedBars */
function RankedPanelSkeleton({ title = "w-40" }: { title?: string }) {
  const widths = ["w-full", "w-4/5", "w-3/5", "w-2/5", "w-1/4"];
  return (
    <Card>
      <CardTitle width={title} />
      {widths.map((width, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-3 w-20 shrink-0" />
          <div className="min-w-0 flex-1">
            <Skeleton className={clsx("h-3 rounded-full", width)} />
          </div>
          <Skeleton className="h-3 w-6 shrink-0" />
        </div>
      ))}
    </Card>
  );
}

/** A table card: its title (and what sits beside it) above the rows */
function TableCardSkeleton({ title = "w-36", aside, columns = 6 }: { title?: string; aside?: ReactNode; columns?: number }) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle width={title} />
        {aside}
      </div>
      <ListSkeleton label="Loading the table" columns={columns} quiet />
    </Card>
  );
}

/** The period switch (a SegmentedControl): in its own row below 112rem, in the top bar from it */
function PeriodSwitchSkeleton({ className }: { className?: string }) {
  return <Skeleton className={clsx("h-9 w-full max-w-md rounded-full", className)} />;
}

// --- Screens -----------------------------------------------------------------------------------

/** The Dashboard: stat cards, Salon notes and today's bookings beside the charts (after the stat
 *  cards on a phone), the bookings table and the links to Sales and Performance */
function DashboardBody() {
  return (
    <>
      <StatsSkeleton spark grid="grid-cols-2 xl:grid-cols-4" />
      <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-3 md:gap-6 lg:order-last">
          {/* Salon notes: the tinted top with its to-dos, then the insights */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-crimson-light/60 bg-milk shadow-petal">
            <div className="flex flex-col gap-6 bg-linear-to-br from-crimson-light/60 via-light-orange to-crimson-light/30 p-6">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-3 w-28" />
                {[0, 1].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl bg-milk/70 py-1.5 pl-1.5 pr-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <Skeleton className="h-3.5 w-36 max-w-full" />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 p-6">
              <CardTitle width="w-28" icon />
              <LinesSkeleton lines={2} />
            </div>
          </div>
          {/* Active bookings */}
          <Card>
            <div className="flex items-baseline justify-between gap-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-20" />
            </div>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-xl border-l-4 border-crimson-light bg-crimson-light/20 px-3 py-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-24 max-w-full" />
                  <Skeleton className="h-3 w-20 max-w-full" />
                </div>
                <div className="flex min-w-0 flex-col items-end gap-1.5">
                  <Skeleton className="h-3.5 w-16 max-w-full" />
                  <Skeleton className="h-3 w-24 max-w-full" />
                </div>
              </div>
            ))}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-3 md:gap-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-3 md:gap-6 xl:grid-cols-2">
            <BarChartPanelSkeleton />
            <DonutPanelSkeleton />
          </div>
          <TableCardSkeleton
            title="w-32"
            aside={
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <Skeleton className="h-9 w-56 rounded-full" />
                <Skeleton className="h-9 w-full rounded-full sm:w-64" />
              </div>
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-2xl border border-crimson-light/40 bg-milk px-6 py-3 shadow-petal">
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-40 max-w-full" />
                </div>
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/** Sales: the money cards, top services and how bookings ended, then the sales record */
function SalesBody() {
  return (
    <>
      <StatsSkeleton spark grid="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />
      <div className="grid grid-cols-1 gap-3 md:gap-6 xl:grid-cols-2">
        <RankedPanelSkeleton title="w-32" />
        <RankedPanelSkeleton title="w-44" />
      </div>
      <TableCardSkeleton title="w-32" />
    </>
  );
}

/** Performance: the glance cards, the key rates, artist utilization, weekdays and artists */
function PerformanceBody() {
  return (
    <>
      <StatsSkeleton />
      <Card className="grid! grid-cols-2 gap-6! sm:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <Skeleton className="h-3.5 w-24 max-w-full" />
            <Skeleton className="h-7.5 w-16" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </div>
        ))}
      </Card>
      <TableCardSkeleton
        title="w-40"
        columns={7}
        aside={
          <div className="flex items-center gap-1">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-3 md:gap-6 xl:grid-cols-2">
        <RankedPanelSkeleton title="w-36" />
        <RankedPanelSkeleton title="w-44" />
      </div>
    </>
  );
}

/** Dashboard, Sales and Performance: each page's own cards, with the period switch where
 *  ReportPage puts it (the top bar from 112rem, its own row below) */
export function ReportSkeleton({ title }: { title: string }) {
  return (
    <AdminShell title={title} actions={<PeriodSwitchSkeleton className="w-md max-[112rem]:hidden" />}>
      <Loading label={`Loading ${title === "Dashboard" ? "the dashboard" : title.toLowerCase()}`}>
        <PeriodSwitchSkeleton className="shrink-0 min-[112rem]:hidden" />
        {title === "Sales" ? <SalesBody /> : title === "Performance" ? <PerformanceBody /> : <DashboardBody />}
      </Loading>
    </AdminShell>
  );
}

/** A content editor: the settings panel (save bar, then sections of fields) and the preview; on a
 *  phone, the Edit | Preview switch above the panel */
export function CmsEditorSkeleton({ title }: { title: string }) {
  return (
    <AdminShell title={title}>
      <Loading label={`Loading ${title}`}>
        <Skeleton className="h-9 w-48 shrink-0 rounded-full lg:hidden" />
        <div className="flex min-h-0 flex-1 gap-6">
          <Card className="w-full shrink-0 gap-0! p-0! lg:w-95 xl:w-105">
            <div className="flex items-center justify-between gap-3 border-b border-crimson-light/40 px-3 py-3 sm:px-6">
              <Skeleton className="h-3.5 w-28" />
              <div className="flex gap-3">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-8 w-16 rounded-md" />
              </div>
            </div>
            {Array.from({ length: 3 }, (_, section) => (
              <div key={section} className="flex flex-col gap-3 border-b border-crimson-light/40 px-3 py-6 last:border-b-0 sm:px-6">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-56 max-w-full" />
                <Skeleton className="mt-1 h-3 w-16" />
                <Skeleton className={section === 0 ? "h-24 w-full rounded-md" : "h-10 w-full rounded-md"} />
              </div>
            ))}
          </Card>
          <Card className="hidden flex-1 gap-0! p-0! lg:flex">
            <div className="flex items-center justify-between gap-3 border-b border-crimson-light/40 px-3 py-2">
              <Skeleton className="h-9 w-44 rounded-md" />
              <Skeleton className="h-8 w-48 rounded-full" />
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
            <PageSkeleton className="flex-1" />
          </Card>
        </div>
      </Loading>
    </AdminShell>
  );
}

/** A public page while the editor's preview loads: a hero, a heading and a row of cards */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-6 bg-crimson-light/10 p-6", className)}>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="mx-auto h-6 w-1/3" />
      <LinesSkeleton lines={2} className="mx-auto w-2/3 items-center" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** The Schedule: the week grid on a computer; on a phone, the Day | Month switch and Filter, the
 *  week strip, the day's header and its timeline */
export function ScheduleSkeleton() {
  return (
    <AdminShell title="Schedule">
      <Loading label="Loading the schedule">
        <div className="flex flex-col gap-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-9 w-44 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
            <div className="grid min-w-0 flex-1 grid-cols-7 gap-1">
              {Array.from({ length: 7 }, (_, i) => (
                <Skeleton key={i} className="h-16 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
          </div>
          <div className="flex items-end justify-between gap-3 border-b border-crimson-light/50 pb-3">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="grid grid-cols-[4.5rem_1fr] items-start gap-6">
              <div className="flex flex-col items-end gap-1.5 pt-3">
                <Skeleton className="h-3.5 w-14" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-l-4 border-crimson-light/40 border-l-crimson-light bg-milk px-3 py-3 shadow-petal">
                <Skeleton className="h-4 w-36 max-w-full" />
                <Skeleton className="h-3 w-28 max-w-full" />
                <Skeleton className="mt-1 h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Computer: the week's arrows and label, Today, the search and the two filters, then
            artists down the side and days across */}
        <div className="hidden min-h-0 flex-1 flex-col gap-3 lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="mx-3 h-4 w-40" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="ml-auto h-9 w-64 rounded-full" />
            <Skeleton className="h-10 w-48 rounded-md" />
            <Skeleton className="h-10 w-48 rounded-md" />
          </div>
          <Card className="gap-0! p-0!">
            <div className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] border-b border-crimson-light/50">
              <span />
              {Array.from({ length: 7 }, (_, day) => (
                <div key={day} className="flex flex-col items-center gap-1.5 px-2 py-3">
                  <Skeleton className="h-3 w-8" />
                  <Skeleton className="h-5 w-6" />
                </div>
              ))}
            </div>
            {Array.from({ length: 5 }, (_, artist) => (
              <div key={artist} className="grid grid-cols-[160px_repeat(7,minmax(0,1fr))] border-b border-dotted border-crimson-light last:border-b-0">
                <div className="flex items-center gap-3 px-3 py-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
                {Array.from({ length: 7 }, (_, day) => (
                  <div key={day} className="flex flex-col gap-1.5 border-l border-dotted border-crimson-light p-2">
                    {(artist + day) % 3 !== 2 && <Skeleton className="h-10 w-full rounded-lg" />}
                    {(artist + day) % 4 === 0 && <Skeleton className="h-10 w-full rounded-lg" />}
                  </div>
                ))}
              </div>
            ))}
          </Card>
        </div>
      </Loading>
    </AdminShell>
  );
}

/** A profile card (ProfilePanel): photo, name and badges, the highlighted box and the info rows */
function ProfileSkeleton({ className }: { className?: string }) {
  return (
    <Card className={clsx("gap-6!", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-6 w-36 max-w-full" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-xl border border-crimson-light/60 bg-light-orange/40 p-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex flex-col gap-3 border-t border-crimson-light/50 pt-3">
        <Skeleton className="h-5 w-24" />
        {["w-40", "w-32", "w-44", "w-28"].map((width) => (
          <div key={width} className="flex flex-col gap-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className={clsx("h-3.5 max-w-full", width)} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** The Admin Directory: the totals, the admins card (its title and Add admin, then the rows) and
 *  the chosen admin's profile (after the table on a phone) */
export function AdminDirectorySkeleton() {
  return (
    <AdminShell title="Admin Directory">
      <Loading label="Loading admins">
        <StatsSkeleton />
        <div className="grid grid-cols-1 gap-3 md:gap-6 lg:grid-cols-3">
          <div className="min-w-0 lg:col-span-2">
            <TableCardSkeleton title="w-24" columns={4} aside={<Skeleton className="h-8 w-28 rounded-md" />} />
          </div>
          <ProfileSkeleton />
        </div>
      </Loading>
    </AdminShell>
  );
}

/** The loyalty scanner: the camera card, the scan result and the recent scans */
export function ScannerSkeleton() {
  return (
    <AdminShell title="Loyalty QR Scanner">
      <Loading label="Loading the scanner" className="grid! grid-cols-1 max-lg:flex! xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle width="w-24" icon />
          <Skeleton className="aspect-square w-full rounded-xl md:aspect-video" />
          <Skeleton className="h-10 w-full rounded-md" />
        </Card>
        <div className="flex min-h-0 flex-col gap-3 md:gap-6">
          <Card>
            <CardTitle width="w-28" icon />
            <Skeleton className="h-16 w-full rounded-xl" />
          </Card>
          <Card>
            <CardTitle width="w-32" icon />
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </Loading>
    </AdminShell>
  );
}

/** A client's page: the profile panel and the tabbed panel (Overview: the three compact stats,
 *  then the booking tracker), each 80vh tall on a computer */
export function ClientPageSkeleton() {
  return (
    <AdminShell title="Client" actions={<Skeleton className="h-4 w-28" />}>
      <Loading label="Loading the client" className="grid! grid-cols-1 items-start lg:grid-cols-3">
        <ProfileSkeleton className="lg:h-[80vh]" />
        <Card className="gap-0! p-0! lg:col-span-2 lg:h-[80vh]">
          <div className="flex gap-6 border-b border-crimson-light/50 px-6 py-3">
            {["w-20", "w-32", "w-28"].map((width) => (
              <Skeleton key={width} className={clsx("h-4", width)} />
            ))}
          </div>
          <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <CompactStatSkeleton />
              <CompactStatSkeleton />
              <CompactStatSkeleton className="col-span-2 sm:col-span-1" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-32 max-w-full" />
                    <Skeleton className="h-3 w-44 max-w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </Loading>
    </AdminShell>
  );
}
