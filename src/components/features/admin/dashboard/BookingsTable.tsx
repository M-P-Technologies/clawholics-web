import { Search, SquarePen } from "lucide-react";
import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { manilaToday } from "@/lib/dashboardPeriods";
import { Link } from "@/lib/router";
import { ADMIN_APPOINTMENTS_KEY, type Appointment, type AppointmentPageParams } from "@/services/appointmentService";
import type { BookingsLoader } from "@/hooks/admin/useReports";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTableLayout } from "@/hooks/useMinWidth";
import { Button } from "@/components/atoms";
import { CardFields, RowCard, RowCards, TableFrame } from "@/components/organisms";
import { Pagination, SegmentedControl, pageView } from "@/components/molecules";
import { ListSkeleton } from "@/components/features/admin/skeletons/ListSkeleton";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
};

const STATUS: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: "Confirmed", className: "bg-crimson-light/50 text-berry" },
  COMPLETED: { label: "Completed", className: "bg-success/20 text-gray-red" },
  PENDING: { label: "Pending", className: "bg-sand text-gray-red" },
  AWAITING_PROOF: { label: "Awaiting proof", className: "bg-sand text-gray-red" },
  CANCELLED: { label: "Cancelled", className: "bg-danger/15 text-gray-red" },
  CANCELED: { label: "Cancelled", className: "bg-danger/15 text-gray-red" },
  REFUNDED: { label: "Refunded", className: "bg-danger/15 text-gray-red" },
};
const CANCELLED = ["CANCELLED", "CANCELED", "REFUNDED"];
// Still to come: not cancelled, refunded or completed
const UPCOMING = ["PENDING", "AWAITING_PROOF", "CONFIRMED"];
const statusOf = (a: Appointment) => (a.status ?? "").trim().toUpperCase();
/** Five to a page keeps the dashboard short */
const PAGE = 5;

type Tab = "upcoming" | "all" | "cancelled";
const TABS: { value: Tab; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "all", label: "All" },
  { value: "cancelled", label: "Cancelled" },
];

// A walk-in: flagged, or booked on the shared walk-in guest account (whose bookings aren't always flagged)
const WALKIN_EMAIL = "walkin-guest@clawholics.local";
const isWalkin = (a: Appointment) => Boolean(a.is_walkin) || (a.email ?? "").trim().toLowerCase() === WALKIN_EMAIL;
const clientName = (a: Appointment) => `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Client";

// Every booking in one table, like the Appointments screen but at a glance: Upcoming (still to
// come, soonest first), All and Cancelled (newest first), with a search and pages of ten. Each
// client with an account opens their client page. On a phone each booking is a card.
export default function BookingsTable({ load }: { load: BookingsLoader }) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const asTable = useTableLayout();
  // The search asks the server once typing pauses
  const search = useDebouncedValue(query.trim());

  // One page from the server for the tab: Upcoming soonest first, the others newest first
  const today = manilaToday(new Date());
  const [lastTotal, setLastTotal] = useState(0);
  const params: AppointmentPageParams = {
    // A list that shrank keeps you on its last page rather than past it
    page: Math.min(page, Math.max(1, Math.ceil(lastTotal / PAGE))),
    pageSize: PAGE,
    search,
    ...(tab === "upcoming"
      ? { statuses: UPCOMING, from: today, sort: "upcoming" }
      : tab === "cancelled"
        ? { statuses: CANCELLED, sort: "latest" }
        : { sort: "latest" }),
  };
  const bookings = useQuery({
    queryKey: [...ADMIN_APPOINTMENTS_KEY, "dashboard", params],
    queryFn: () => load(params),
    placeholderData: keepPreviousData,
  });
  // A failed refresh keeps the page on screen; a failed load of another tab or page has no data
  const current = bookings.data;
  if (current && current.total !== lastTotal) setLastTotal(current.total);
  const rows = current?.rows ?? null;
  const failed = bookings.isError && !current;
  const view = pageView(rows ?? [], params.page, PAGE, current?.total ?? 0);

  const choose = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  return (
    <section aria-label="Bookings" className="flex min-w-0 flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl label="Which bookings" options={TABS} value={tab} onChange={choose} />
        <label className="relative w-full sm:w-64">
          <span className="sr-only">Search bookings</span>
          <input
            type="search"
            aria-label="Search bookings"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search client, service, artist…"
            className="h-9 w-full rounded-full border border-crimson-light bg-milk pl-4 pr-9 text-[13px] text-gray-red outline-none placeholder:text-gray-red/60 focus:ring-2 focus:ring-crimson"
          />
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-red/60" />
        </label>
      </div>

      {failed ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-red">
          We couldn&apos;t load the bookings.
          <Button type="button" variant="secondary" onClick={() => void bookings.refetch()}>
            Try again
          </Button>
        </div>
      ) : rows === null ? (
        <ListSkeleton label="Loading the bookings" columns={6} />
      ) : (
        <>
          {!asTable ? (
            <RowCards label="Bookings">
              {view.rows.map((a) => {
                const name = clientName(a);
                const status = statusOf(a);
                const badge = STATUS[status] ?? { label: a.status, className: "bg-sand text-gray-red" };
                return (
                  <RowCard key={a.id}>
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-base text-berry">
                        {name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{name}</span>
                        {a.email && !isWalkin(a) && <span className="block truncate text-[12px] text-gray-red/70">{a.email}</span>}
                      </span>
                      <span className={clsx("shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-bold", badge.className)}>{badge.label}</span>
                    </div>
                    <CardFields
                      fields={[
                        ["Service", a.service_name],
                        ["Artist", a.nailist_name],
                        ["Date", dateLabel(a.appointment_date)],
                        ["Time", a.appointment_time],
                      ]}
                    />
                    {isWalkin(a) ? (
                      <span className="text-[12px] text-gray-red/60">Walk-in</span>
                    ) : (
                      <Link
                        to={`/clients/${a.user_id}`}
                        aria-label={`Open ${name}`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-berry px-3 py-2 text-[13px] font-bold text-pearl transition-colors hover:bg-gray-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
                      >
                        <SquarePen size={15} aria-hidden="true" />
                        Client page
                      </Link>
                    )}
                  </RowCard>
                );
              })}
            </RowCards>
          ) : (
          <TableFrame label="Bookings" minWidthClass="min-w-[720px]"
            head={
              <tr className="text-left text-[12px] text-gray-red/70">
                {["Client", "Service", "Artist", "Date", "Time", "Status", "Manage"].map((h) => (
                  <th key={h} scope="col" className={clsx("pb-2 font-medium", h === "Manage" && "text-center")}>
                    {h}
                  </th>
                ))}
              </tr>
            }
          >
          {view.rows.map((a) => {
            const name = clientName(a);
            const status = STATUS[statusOf(a)] ?? { label: a.status, className: "bg-sand text-gray-red" };
            const cell = "border-t border-dotted border-crimson-light py-3 pr-3";
            return (
              <tr key={a.id}>
                <th scope="row" className={clsx(cell, "text-left font-normal")}>
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-base text-berry">
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-bold">{name}</span>
                      {a.email && !isWalkin(a) && <span className="block truncate text-[12px] text-gray-red/70">{a.email}</span>}
                    </span>
                  </span>
                </th>
                <td className={cell}>{a.service_name}</td>
                <td className={cell}>{a.nailist_name}</td>
                <td className={clsx(cell, "whitespace-nowrap")}>{dateLabel(a.appointment_date)}</td>
                <td className={clsx(cell, "whitespace-nowrap")}>{a.appointment_time}</td>
                <td className={cell}>
                  <span className={clsx("whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-bold", status.className)}>{status.label}</span>
                </td>
                <td className={clsx(cell, "pr-0 text-center")}>
                  {isWalkin(a) ? (
                    <span className="text-[12px] text-gray-red/60">Walk-in</span>
                  ) : (
                    <Link
                      to={`/clients/${a.user_id}`}
                      aria-label={`Open ${name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-berry text-pearl transition-colors hover:bg-gray-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson"
                    >
                      <SquarePen size={15} aria-hidden="true" />
                    </Link>
                  )}
                </td>
              </tr>
            );
          })}
          </TableFrame>
          )}

          {view.rows.length === 0 && (
            <p className="text-sm text-gray-red/70">
              {query.trim() ? "No bookings match your search." : tab === "cancelled" ? "No cancelled bookings." : tab === "upcoming" ? "No upcoming bookings." : "No bookings yet."}
            </p>
          )}

          <Pagination page={view.current} totalPages={view.pages} onPageChange={setPage} summary={view} />
        </>
      )}
    </section>
  );
}
