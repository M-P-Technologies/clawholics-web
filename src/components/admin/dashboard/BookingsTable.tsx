import { Search, SquarePen } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { manilaToday } from "../../../lib/dashboardPeriods";
import { Link } from "../../../lib/router";
import type { Appointment } from "../../../services/appointmentService";
import { useTableLayout } from "../../../hooks/useMinWidth";
import Button from "../../ui/Button";
import { CardFields, RowCard, RowCards } from "../RowCards";
import TablePager, { paginate } from "./TablePager";
import { ListSkeleton } from "../ListSkeleton";

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
const statusOf = (a: Appointment) => (a.status ?? "").trim().toUpperCase();

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
const startOf = (a: Appointment) => `${a.appointment_date} ${a.appointment_time.split("-")[0].trim().padStart(5, "0")}`;

// Every booking in one table, like the Appointments screen but at a glance: Upcoming (still to
// come, soonest first), All and Cancelled (newest first), with a search and pages of ten. Each
// client with an account opens their client page. On a phone each booking is a card.
export default function BookingsTable({ load }: { load: () => Promise<Appointment[]> }) {
  const [rows, setRows] = useState<Appointment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const asTable = useTableLayout();

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const loaded = await load();
        if (live) {
          setRows(loaded);
          setFailed(false);
        }
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [load, attempt]);

  const today = manilaToday(new Date());
  const q = query.trim().toLowerCase();
  const shown = (rows ?? [])
    .filter((a) => {
      const status = statusOf(a);
      if (tab === "cancelled") return CANCELLED.includes(status);
      if (tab === "upcoming") return a.appointment_date >= today && !CANCELLED.includes(status) && status !== "COMPLETED";
      return true;
    })
    .filter((a) => !q || [clientName(a), a.email, a.service_name, a.nailist_name].some((v) => (v ?? "").toLowerCase().includes(q)))
    .sort((a, b) => (tab === "upcoming" ? startOf(a).localeCompare(startOf(b)) : startOf(b).localeCompare(startOf(a))) || a.id - b.id);

  const view = paginate(shown, page, 5); // five to a page keeps the dashboard short

  const choose = (next: Tab) => {
    setTab(next);
    setPage(1);
  };

  return (
    <section aria-label="Bookings" className="flex min-w-0 flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Which bookings" className="flex gap-1 rounded-full bg-crimson-light/25 p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => choose(t.value)}
              className={clsx(
                "rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors",
                tab === t.value ? "bg-milk text-berry shadow-sm" : "text-gray-red/80 hover:text-berry",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
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
          <Button type="button" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
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
          <div className="-mx-5 overflow-x-auto px-5">
            <table aria-label="Bookings" className="w-full min-w-[720px] border-separate border-spacing-0 text-sm text-gray-red">
              <thead>
                <tr className="text-left text-[12px] text-gray-red/70">
                  {["Client", "Service", "Artist", "Date", "Time", "Status", "Manage"].map((h) => (
                    <th key={h} scope="col" className={clsx("pb-2 font-medium", h === "Manage" && "text-center")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
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
              </tbody>
            </table>
          </div>
          )}

          {shown.length === 0 && (
            <p className="text-sm text-gray-red/70">
              {q ? "No bookings match your search." : tab === "cancelled" ? "No cancelled bookings." : tab === "upcoming" ? "No upcoming bookings." : "No bookings yet."}
            </p>
          )}

          <TablePager view={view} onPage={setPage} />
        </>
      )}
    </section>
  );
}
