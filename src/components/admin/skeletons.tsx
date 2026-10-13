import type { ReactNode } from "react";
import clsx from "clsx";
import AdminShell from "./AdminShell";
import { ListSkeleton } from "./ListSkeleton";
import Skeleton from "../ui/Skeleton";

// The admin screens' loading placeholders: each is shaped like the screen it stands in for,
// inside the real AdminShell (sidebar and title), so the page doesn't jump when the data arrives.
// Each one is a single role="status" region named for what's loading; the bars themselves are
// hidden from screen readers.

/** A card like the screens' panels, holding placeholders */
function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("flex min-w-0 flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal", className)}>{children}</div>;
}

/** The whole screen's loading region, with its name read out once */
function Loading({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} className={clsx("flex min-h-0 flex-1 flex-col gap-4 overflow-hidden pb-2 md:gap-6", className)}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** A stat card: label, figure and hint */
function StatCardSkeleton({ bare = false }: { bare?: boolean }) {
  const body = (
    <>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-[30px] w-20 sm:h-9 lg:h-[30px] xl:h-9" />
      <Skeleton className="h-3 w-32" />
    </>
  );
  return bare ? <div className="flex flex-col gap-2">{body}</div> : <Card className="!gap-2 p-4 sm:p-5">{body}</Card>;
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Lines of text of varying width */
export function LinesSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  const widths = ["w-full", "w-11/12", "w-4/5", "w-2/3", "w-3/4"];
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={clsx("h-3.5", i === lines - 1 ? "w-1/2" : widths[i % widths.length])} />
      ))}
    </div>
  );
}

/** A dashboard panel: its title and a chart */
function ChartPanelSkeleton() {
  const bars = ["h-[35%]", "h-[60%]", "h-[45%]", "h-[80%]", "h-[55%]", "h-[70%]", "h-[40%]"];
  return (
    <Card>
      <Skeleton className="h-5 w-40" />
      <div className="flex h-44 items-end gap-3 border-b border-crimson-light/50 pb-px">
        {bars.map((height, i) => (
          <Skeleton key={i} className={clsx("flex-1 rounded-b-none", height)} />
        ))}
      </div>
    </Card>
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

// --- Screens -----------------------------------------------------------------------------------

/** Dashboard, Sales and Performance: the stat cards, two charts and a table */
export function ReportSkeleton({ title }: { title: string }) {
  return (
    <AdminShell title={title} actions={<Skeleton className="h-9 w-64 max-w-full rounded-full" />}>
      <Loading label={`Loading ${title === "Dashboard" ? "the dashboard" : title.toLowerCase()}`}>
        <StatsSkeleton />
        <div className="grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
          <ChartPanelSkeleton />
          <ChartPanelSkeleton />
        </div>
        <Card>
          <Skeleton className="h-5 w-36" />
          <ListSkeleton label="Loading the table" columns={6} quiet />
        </Card>
      </Loading>
    </AdminShell>
  );
}

/** A content editor: the settings panel and the preview */
export function CmsEditorSkeleton({ title }: { title: string }) {
  return (
    <AdminShell title={title}>
      <Loading label={`Loading ${title}`} className="!flex-row !gap-5">
        <Card className="w-full shrink-0 !gap-6 lg:w-[380px] xl:w-[420px]">
          {/* The save bar, then sections of fields */}
          <div className="flex items-center justify-between gap-3 border-b border-crimson-light/40 pb-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
          {Array.from({ length: 3 }, (_, section) => (
            <div key={section} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-56 max-w-full" />
              <Skeleton className="mt-1 h-3 w-16" />
              <Skeleton className={section === 0 ? "h-24 w-full rounded-xl" : "h-10 w-full rounded-xl"} />
            </div>
          ))}
        </Card>
        <Card className="hidden flex-1 !p-0 lg:flex">
          <div className="flex items-center justify-between gap-2 border-b border-crimson-light/40 px-3 py-2">
            <Skeleton className="h-8 w-44 rounded-lg" />
            <Skeleton className="h-8 w-40 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          <PageSkeleton className="flex-1" />
        </Card>
      </Loading>
    </AdminShell>
  );
}

/** A public page while the editor's preview loads: a hero, a heading and a row of cards */
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("flex flex-col gap-6 bg-crimson-light/10 p-6", className)}>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="mx-auto h-6 w-1/3" />
      <LinesSkeleton lines={2} className="mx-auto w-2/3 items-center" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** The Schedule: the week grid on a computer, the day's list on a phone */
export function ScheduleSkeleton() {
  return (
    <AdminShell title="Schedule">
      <Loading label="Loading the schedule">
        {/* Phone: the Day | Month switch, the days strip and the day's appointments */}
        <div className="flex flex-col gap-4 lg:hidden">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
          <div className="flex gap-2">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-14 flex-1 rounded-xl" />
            ))}
          </div>
          {Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="!gap-2 p-4">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-3 w-32" />
            </Card>
          ))}
        </div>

        {/* Computer: the week's arrows and filters, then artists down the side and days across */}
        <div className="hidden min-h-0 flex-1 flex-col gap-3 lg:flex">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-56 rounded-full" />
            <Skeleton className="ml-auto h-9 w-44 rounded-md" />
            <Skeleton className="h-9 w-56 rounded-full" />
          </div>
          <Card className="!gap-0 !p-0">
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
                <div className="flex items-center gap-2 px-4 py-4">
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

/** The Admin Directory: the totals, the table and the chosen admin's profile */
export function AdminDirectorySkeleton() {
  return (
    <AdminShell title="Admin Directory" actions={<Skeleton className="h-10 w-28 rounded-full" />}>
      <Loading label="Loading admins">
        <StatsSkeleton />
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <ListSkeleton label="Loading the admin list" columns={4} quiet />
          </Card>
          <Card className="items-center !gap-3 max-lg:hidden">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3.5 w-44" />
            <LinesSkeleton lines={4} className="mt-2 w-full" />
          </Card>
        </div>
      </Loading>
    </AdminShell>
  );
}

/** The loyalty scanner: the camera card, the scanned client's card and the recent scans */
export function ScannerSkeleton() {
  return (
    <AdminShell title="Loyalty QR Scanner">
      <Loading label="Loading the scanner" className="!grid grid-cols-1 !gap-5 max-lg:!flex xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="aspect-square w-full rounded-xl md:aspect-video" />
          <Skeleton className="mx-auto h-10 w-40 rounded-full" />
        </Card>
        <div className="flex flex-col gap-5">
          <Card>
            <Skeleton className="h-6 w-36" />
            <LinesSkeleton lines={3} />
          </Card>
          <Card>
            <Skeleton className="h-6 w-32" />
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

/** A client's page: the profile panel and the tabbed panel */
export function ClientPageSkeleton() {
  return (
    <AdminShell title="Client" actions={<Skeleton className="h-4 w-28" />}>
      <Loading label="Loading the client" className="!grid grid-cols-1 items-start !gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <Card className="!gap-5 lg:h-[80vh]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-3.5 w-24" />
            </div>
          </div>
          <Skeleton className="h-28 w-full rounded-xl" />
          <LinesSkeleton lines={5} />
        </Card>
        <Card className="!gap-0 !p-0 lg:h-[80vh]">
          <div className="flex gap-6 border-b border-crimson-light/50 px-6 py-4">
            {["w-20", "w-32", "w-28"].map((width) => (
              <Skeleton key={width} className={clsx("h-4", width)} />
            ))}
          </div>
          <div className="flex flex-col gap-5 p-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <StatCardSkeleton key={i} bare />
              ))}
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
            <LinesSkeleton lines={4} />
          </div>
        </Card>
      </Loading>
    </AdminShell>
  );
}
