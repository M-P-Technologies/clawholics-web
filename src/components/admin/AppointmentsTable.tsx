import { useAuth, useUser } from "@clerk/nextjs";
import { Check, ChevronDown, Plus, Search, SquarePen } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import AppointmentDetailsModal from "./AppointmentDetailsModal";
import CreateAppointmentModal from "./CreateAppointmentModal";
import { CardFields, CARDS_PER_PAGE, RowCard, RowCards } from "./RowCards";
import TablePager, { paginate } from "./dashboard/TablePager";
import { Button, Select, initialsOf } from "@/components/atoms";
import Sheet from "../ui/Sheet";
import { useToast } from "../ui/ToastProvider";
import { Link, useSearchParams } from "@/lib/router";
import { monthYear, relativeDay, type DirectoryProfile } from "./DirectoryProfileCard";
import { usePolling } from "../../hooks/usePolling";
import { useTableLayout } from "../../hooks/useMinWidth";
import { API_BASE_URL } from "../../apiConfig";
import { matchesAppointmentFilter, type AppointmentFilterStatus } from "../../services/appointmentFilters";
import { fetchAppointments, updateAppointmentStatus, type Appointment, type AppointmentStatus } from "../../services/appointmentService";
import { getProofState, isProofOverdue } from "../../services/proofState";

/** The status filter; the page can open on one (the dashboard links here): `?status=PENDING` */
const STATUS_OPTIONS: { label: string; value: AppointmentFilterStatus }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Awaiting proof", value: "AWAITING_PROOF" },
  { label: "Proofs to review", value: "PROOF_PENDING" },
  { label: "Proof overdue", value: "PROOF_OVERDUE" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Refunded", value: "REFUNDED" },
];

export const parseStatusParam = (value: string | null): AppointmentFilterStatus =>
  STATUS_OPTIONS.find((option) => option.value === value)?.value ?? "ALL";

const SORT_OPTIONS = ["Upcoming First", "Latest First", "Recently Booked", "Oldest Booked"];

// Five to a page, like the dashboard's bookings table
const ROWS_PER_PAGE = 5;

const STATUSES: AppointmentStatus[] = ["PENDING", "AWAITING_PROOF", "CONFIRMED", "COMPLETED", "CANCELLED", "REFUNDED"];

// Dot beside each status, so the colour says what it means before you read it
const statusDotClass = (status: AppointmentStatus) => {
  switch (status) {
    case "PENDING":
    case "AWAITING_PROOF":
      return "bg-warning";
    case "CONFIRMED":
      return "bg-info";
    case "COMPLETED":
      return "bg-success";
    case "CANCELLED":
      return "bg-danger";
    case "REFUNDED":
      return "bg-crimson-light";
    default:
      return "bg-gray-red/50";
  }
};

const STATUS_CHOICES = STATUSES.map((status) => ({
  value: status,
  label: status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " "),
  leading: <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(status)}`} />,
}));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateLabel = (ymd?: string) => {
  if (!ymd) return "–";
  const [y, m, d] = ymd.split("-").map(Number);
  return MONTHS[m - 1] ? `${MONTHS[m - 1]} ${d}, ${y}` : ymd;
};

interface NailArtist {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
}

const artistName = (artist: NailArtist) => artist.name || `${artist.first_name ?? ""} ${artist.last_name ?? ""}`.trim();
const clientName = (a: Appointment) => `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || `User #${a.user_id}`;
const statusOf = (a: Appointment) => (a.status?.trim().toUpperCase() || "PENDING") as AppointmentStatus;
const timeOf = (value?: string | null) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
};
const startOf = (a: Appointment) => timeOf(`${a.appointment_date} ${a.appointment_time}`);

// The proof badge beside a client: a proof to review, or one that's overdue
// A proof waiting for review is a button: it opens the review (the client page has no proof review)
function ProofBadge({ appointment, now, onReview }: { appointment: Appointment; now: number; onReview: () => void }) {
  const kind = isProofOverdue(appointment, now) ? "overdue" : getProofState(appointment, now).kind;
  if (kind === "overdue") return <span className="whitespace-nowrap rounded-md bg-danger/10 px-2 py-0.5 text-[11px] font-bold text-danger">Proof overdue</span>;
  if (kind === "in_review")
    return (
      <button
        type="button"
        onClick={onReview}
        aria-label={`Review the payment proof for appointment #${appointment.id}`}
        className="whitespace-nowrap rounded-md bg-warning/15 px-2 py-0.5 text-[11px] font-bold text-warning underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-crimson"
      >
        Proof to review
      </button>
    );
  return null;
}

// A walk-in: flagged, or booked on the shared walk-in guest account
const WALKIN_EMAIL = "walkin-guest@clawholics.local";
const isWalkin = (a: Appointment) => Boolean(a.is_walkin) || (a.email ?? "").trim().toLowerCase() === WALKIN_EMAIL;

interface AppointmentsTableProps {
  /** Each client's photo, join date and last sign-in (from Clerk), by users.id */
  clients?: Record<number, DirectoryProfile>;
}

// Every appointment with its client, drawn like the dashboard's bookings table: a status, an
// artist and a sort, a search, and pages of five. Each row has
// the client's photo, email, phone, when they joined, when they were last active and their visits
// (completed appointments); the name opens their client page. The status changes right in the
// row; Manage opens the client's page, and a proof to review opens its review. It refreshes
// itself every 30 seconds while on screen.
export default function AppointmentsTable({ clients = {} }: AppointmentsTableProps) {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [searchParams] = useSearchParams();
  const asTable = useTableLayout();

  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [artists, setArtists] = useState<NailArtist[]>([]);
  const [status, setStatus] = useState<AppointmentFilterStatus>(() => parseStatusParam(searchParams.get("status")));
  const [artist, setArtist] = useState("All");
  const [sort, setSort] = useState(SORT_OPTIONS[0]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [creating, setCreating] = useState(false);
  const [slotTaken, setSlotTaken] = useState(false);
  // Phone: which filter's drawer is open
  const [openFilter, setOpenFilter] = useState<"status" | "artist" | "sort" | null>(null);
  // The time the proof badges and filters are worked out against, updated with each load
  const [now, setNow] = useState(() => Date.now());

  const load = async () => {
    try {
      const data = await fetchAppointments(STATUSES, await getToken(), currentUser?.id);
      setAppointments(data.filter((a) => STATUSES.includes(statusOf(a))));
      setNow(Date.now());
      setFailed(false);
    } catch (error) {
      // A failed refresh keeps the list on screen; the error shows only when there's none yet
      console.warn("Couldn't load the appointments:", error);
      setFailed(true);
    }
  };

  const loadArtists = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/nailists`, { headers: { "x-clawholics-origin": "frontend" } });
      if (res.ok) setArtists(await res.json());
    } catch {
      // the artist filter just lists no artists
    }
  };

  useEffect(() => {
    load();
    loadArtists();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loads once; the polling below refreshes
  }, []);

  // Refresh every 30 seconds, only while this tab is on screen
  usePolling(load, { intervalMs: 30000, immediate: false });

  // A new filter or search starts again on the first page
  const choose = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setPage(1);
  };

  const changeStatus = async (id: number, next: AppointmentStatus) => {
    try {
      const updated = await updateAppointmentStatus(id, next, await getToken(), currentUser?.id);
      const updatedStatus = statusOf(updated);
      toast.show("success", "Appointment updated", `Appointment #${id} is now ${updatedStatus.toLowerCase().replace(/_/g, " ")}.`);
      setAppointments((prev) => (prev ?? []).filter((a) => a.id !== id).concat(STATUSES.includes(updatedStatus) ? [updated] : []));
      setSelected((current) => (current?.id === id ? (matchesAppointmentFilter(updated, status, now) ? updated : null) : current));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("SLOT_TAKEN") || message.includes("slot")) {
        setSlotTaken(true);
        return;
      }
      console.error(error);
      toast.show("error", "Status not changed", "The appointment status is unchanged. Please try again.");
    }
  };

  const q = query.trim().toLowerCase();
  const shown = (appointments ?? [])
    .filter((a) => matchesAppointmentFilter(a, status, now))
    .filter((a) => artist === "All" || a.nailist_name === artist)
    .filter((a) => !q || [String(a.id), `#${a.id}`, clientName(a), a.email, a.service_name, a.nailist_name].some((v) => (v ?? "").toLowerCase().includes(q)))
    .sort((a, b) => {
      if (sort === "Latest First") return startOf(b) - startOf(a);
      if (sort === "Recently Booked") return timeOf(b.created_at) - timeOf(a.created_at);
      if (sort === "Oldest Booked") return timeOf(a.created_at) - timeOf(b.created_at);
      return startOf(a) - startOf(b);
    });
  const view = paginate(shown, page, asTable ? ROWS_PER_PAGE : CARDS_PER_PAGE);

  // Visits: each client's completed appointments
  const visits = new Map<number, number>();
  for (const a of appointments ?? []) {
    if (statusOf(a) === "COMPLETED") visits.set(a.user_id, (visits.get(a.user_id) ?? 0) + 1);
  }
  const clientFacts = (a: Appointment) => {
    const profile = isWalkin(a) ? undefined : clients[a.user_id];
    return {
      profile,
      phone: a.phone?.trim() || "–",
      joined: monthYear(profile?.joinedAt) || "–",
      lastActive: relativeDay(profile?.lastSignInAt) || "–",
      visits: isWalkin(a) ? "–" : String(visits.get(a.user_id) ?? 0),
    };
  };

  const clientCell = (a: Appointment, size: "row" | "card") => {
    const name = clientName(a);
    const { profile } = clientFacts(a);
    const box = size === "row" ? "h-9 w-9" : "h-10 w-10";
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        {profile?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Clerk's image host
          <img src={profile.imageUrl} alt="" className={clsx(box, "shrink-0 rounded-full object-cover")} />
        ) : (
          <span aria-hidden="true" className={clsx(box, "flex shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-sm text-berry")}>
            {initialsOf(name)}
          </span>
        )}
        <span className="min-w-0">
          {isWalkin(a) ? (
            <span className="block truncate font-bold">{name}</span>
          ) : (
            <Link to={`/clients/${a.user_id}`} className="block truncate font-bold text-gray-red hover:text-berry hover:underline">
              {name}
            </Link>
          )}
          <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-gray-red/70">
            {isWalkin(a) ? "Walk-in" : a.email || `ID #${a.id}`}
            <ProofBadge appointment={a} now={now} onReview={() => setSelected(a)} />
          </span>
        </span>
      </span>
    );
  };
  const artistNames = artists.map(artistName).filter(Boolean);

  // The three filters: dropdowns on a computer, buttons opening a bottom drawer on a phone
  const filters: { key: "status" | "artist" | "sort"; title: string; value: string; options: { value: string; label: string }[]; pick: (value: string) => void }[] = [
    {
      key: "status",
      title: "Status",
      value: status,
      options: STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.value === "ALL" ? "All statuses" : option.label })),
      pick: (value) => choose(setStatus)(value as AppointmentFilterStatus),
    },
    {
      key: "artist",
      title: "Artist",
      value: artist,
      options: [{ value: "All", label: "All artists" }, ...artistNames.map((name) => ({ value: name, label: name }))],
      pick: choose(setArtist),
    },
    { key: "sort", title: "Sort by", value: sort, options: SORT_OPTIONS.map((option) => ({ value: option, label: option })), pick: choose(setSort) },
  ];

  const statusSelect = (a: Appointment) => (
    <Select
      aria-label={`Status of appointment #${a.id}`}
      value={statusOf(a)}
      onChange={(e) => changeStatus(a.id, e.target.value as AppointmentStatus)}
      options={STATUS_CHOICES}
      className="w-[150px]"
      triggerClassName="!h-8 !px-2.5 !py-0 text-[12px]"
    />
  );
  // Manage opens the client's page; a walk-in has none, so theirs is turned off
  const manageButton = (a: Appointment, withLabel = false) => {
    const look = clsx(
      "inline-flex items-center justify-center gap-2 rounded-lg bg-berry text-pearl transition-colors",
      withLabel ? "px-3 py-2 text-[13px] font-bold" : "h-8 w-8",
    );
    if (isWalkin(a)) {
      return (
        <span role="img" aria-label="Walk-ins have no client page" title="Walk-ins have no client page" className={clsx(look, "cursor-not-allowed opacity-40")}>
          <SquarePen size={15} aria-hidden="true" />
          {withLabel && "Manage"}
        </span>
      );
    }
    return (
      <Link to={`/clients/${a.user_id}`} aria-label={`Manage ${clientName(a)}'s client page`} className={clsx(look, "hover:bg-gray-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson")}>
        <SquarePen size={15} aria-hidden="true" />
        {withLabel && "Manage"}
      </Link>
    );
  };

  return (
    <section id="appointments" aria-label="Appointments" className="flex min-w-0 scroll-mt-4 flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk p-4 shadow-petal sm:p-5">
      {/* One row at every width; on a phone the button drops its icon to fit */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate font-display text-2xl font-normal text-gray-red">Appointments</h2>
        <Button type="button" onClick={() => setCreating(true)} className="shrink-0 whitespace-nowrap !px-3 !py-2 text-[12px] sm:!px-4 sm:text-[13px]">
          <Plus size={14} aria-hidden="true" className="hidden sm:block" />
          New appointment
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {asTable ? (
          filters.map((filter) => (
            <Select
              key={filter.key}
              aria-label={filter.title}
              value={filter.value}
              onChange={(e) => filter.pick(e.target.value)}
              options={filter.options}
              className={filter.key === "artist" ? "w-40" : "w-44"}
              triggerClassName="!h-9 !py-0 text-[13px]"
            />
          ))
        ) : (
          // Phone: the three filters in one row, each opening its options in a bottom drawer
          <div className="grid w-full grid-cols-3 gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                aria-label={`${filter.title}: ${filter.options.find((o) => o.value === filter.value)?.label}`}
                onClick={() => setOpenFilter(filter.key)}
                className="flex h-9 min-w-0 items-center justify-between gap-1 rounded-md border border-crimson-light bg-light-orange/70 px-2.5 text-[12px] text-gray-red focus-visible:outline-2 focus-visible:outline-crimson"
              >
                <span className="min-w-0 truncate">{filter.options.find((o) => o.value === filter.value)?.label}</span>
                <ChevronDown size={14} aria-hidden="true" className="shrink-0 text-crimson" />
              </button>
            ))}
          </div>
        )}
        <label className="relative w-full sm:ml-auto sm:w-72">
          <span className="sr-only">Search appointments</span>
          <input
            type="search"
            aria-label="Search appointments"
            value={query}
            onChange={(e) => choose(setQuery)(e.target.value)}
            placeholder="Search client, service, artist, ID…"
            className="h-9 w-full rounded-full border border-crimson-light bg-milk pl-4 pr-9 text-[13px] text-gray-red outline-none placeholder:text-gray-red/60 focus:ring-2 focus:ring-crimson"
          />
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-red/60" />
        </label>
      </div>

      {!asTable &&
        filters.map((filter) => (
          <Sheet key={filter.key} open={openFilter === filter.key} title={filter.title} onClose={() => setOpenFilter(null)}>
            <ul role="listbox" aria-label={filter.title} className="flex flex-col gap-1">
              {filter.options.map((option) => {
                const chosen = option.value === filter.value;
                return (
                  <li key={option.value} role="option" aria-selected={chosen}>
                    <button
                      type="button"
                      onClick={() => {
                        filter.pick(option.value);
                        setOpenFilter(null);
                      }}
                      className={clsx(
                        "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors",
                        chosen ? "bg-crimson-light/40 font-bold text-berry" : "text-gray-red hover:bg-crimson-light/20",
                      )}
                    >
                      {option.label}
                      {chosen && <Check size={16} aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Sheet>
        ))}

      {failed && appointments === null ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-red">
          We couldn&apos;t load the appointments.
          <Button type="button" variant="secondary" onClick={load}>
            Try again
          </Button>
        </div>
      ) : appointments === null ? (
        <p className="text-sm text-gray-red/70">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-red/70">{q || artist !== "All" ? "No appointments match your search." : status === "ALL" ? "No appointments yet." : "No appointments with this status."}</p>
      ) : !asTable ? (
        <RowCards label="Appointments">
          {view.rows.map((a) => (
            <RowCard key={a.id}>
              {clientCell(a, "card")}
              <CardFields
                fields={[
                  ["Appointment", `#${a.id}`],
                  ["Service", a.service_name || "–"],
                  ["Artist", a.nailist_name || "–"],
                  ["Date", dateLabel(a.appointment_date)],
                  ["Time", a.appointment_time || "–"],
                  ["Phone", clientFacts(a).phone],
                  ["Joined", clientFacts(a).joined],
                  ["Last active", clientFacts(a).lastActive],
                  ["Visits", clientFacts(a).visits],
                ]}
              />
              <div className="flex items-center justify-between gap-2">
                {statusSelect(a)}
                {manageButton(a, true)}
              </div>
            </RowCard>
          ))}
        </RowCards>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5">
          <table aria-label="Appointments" className="w-full min-w-[1220px] border-separate border-spacing-0 text-sm text-gray-red">
            <thead>
              <tr className="text-left text-[12px] text-gray-red/70">
                {["Client", "Phone", "Joined", "Last active", "Visits", "Service", "Artist", "Date", "Time", "Status", "Manage"].map((h) => (
                  <th key={h} scope="col" className={clsx("pb-2 pr-3 font-medium", h === "Manage" && "pr-0 text-center", h === "Visits" && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.rows.map((a) => {
                const facts = clientFacts(a);
                const cell = "border-t border-dotted border-crimson-light py-3 pr-3";
                return (
                  <tr key={a.id}>
                    <th scope="row" className={clsx(cell, "max-w-[240px] text-left font-normal")}>
                      {clientCell(a, "row")}
                    </th>
                    <td className={clsx(cell, "whitespace-nowrap")}>{facts.phone}</td>
                    <td className={clsx(cell, "whitespace-nowrap")}>{facts.joined}</td>
                    <td className={clsx(cell, "whitespace-nowrap")}>{facts.lastActive}</td>
                    <td className={clsx(cell, "text-right font-bold")}>{facts.visits}</td>
                    <td className={cell}>
                      {a.service_name || "–"}
                      <span className="block text-[12px] text-gray-red/60">#{a.id}</span>
                    </td>
                    <td className={cell}>{a.nailist_name || "–"}</td>
                    <td className={clsx(cell, "whitespace-nowrap")}>{dateLabel(a.appointment_date)}</td>
                    <td className={clsx(cell, "whitespace-nowrap")}>{a.appointment_time || "–"}</td>
                    <td className={cell}>{statusSelect(a)}</td>
                    <td className={clsx(cell, "pr-0 text-center")}>{manageButton(a)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {appointments !== null && <TablePager view={view} onPage={setPage} />}

      {/* Phones: a round button to add an appointment, above the tab bar */}
      <Button
        type="button"
        aria-label="Create appointment"
        onClick={() => setCreating(true)}
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full !p-0 shadow-lg shadow-crimson/30 lg:hidden"
      >
        <Plus size={24} aria-hidden="true" />
      </Button>

      {creating && (
        <CreateAppointmentModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
            toast.show("success", "Appointment created", "The walk-in appointment was added and now shows in the list.");
          }}
        />
      )}

      {slotTaken && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-gray-red/40 px-4 drawer-backdrop sm:items-center max-sm:p-0">
          <div role="alertdialog" aria-label="Slot already taken" className="flex w-full max-w-[380px] flex-col gap-4 rounded-2xl bg-milk px-8 py-4 shadow-lg drawer-panel max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-md">
            <h3 className="text-center font-display text-xl text-gray-red">Slot already taken</h3>
            <p className="text-center text-[14px] text-gray-red">This appointment slot has already been taken by another active appointment.</p>
            <div className="flex justify-center">
              <Button type="button" onClick={() => setSlotTaken(false)}>
                Okay
              </Button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <AppointmentDetailsModal
          appointment={selected}
          onClose={() => setSelected(null)}
          onStatusChange={changeStatus}
          tokenFetcher={getToken}
          clerkId={currentUser?.id}
          onProofReviewed={async () => {
            setSelected(null);
            await load();
          }}
        />
      )}
    </section>
  );
}
