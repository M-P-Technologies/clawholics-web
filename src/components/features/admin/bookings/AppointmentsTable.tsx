import { useAuth, useUser } from "@clerk/nextjs";
import { Check, ChevronDown, Plus, Search, SquarePen } from "lucide-react";
import { useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminDataChanged, adminQueries } from "@/lib/adminQueries";
import clsx from "clsx";
import AppointmentDetailsModal from "@/components/features/admin/bookings/AppointmentDetailsModal";
import CreateAppointmentDialog from "@/components/features/admin/bookings/CreateAppointmentDialog";
import ProofThumb from "@/components/features/admin/bookings/ProofThumb";
import { ListSkeleton } from "@/components/features/admin/skeletons/ListSkeleton";
import { AlertDialog, CardFields, CARDS_PER_PAGE, Dialog, RowCard, RowCards, TableFrame } from "@/components/organisms";
import { Button, Select, initialsOf } from "@/components/atoms";
import { Pagination, pageView, useToast } from "@/components/molecules";
import { Link, useSearchParams } from "@/lib/router";
import { monthYear, relativeDay, type DirectoryProfile } from "@/components/features/admin/directory/DirectoryProfileCard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useTableLayout } from "@/hooks/useMinWidth";
import { matchesAppointmentFilter, type AppointmentFilterStatus } from "@/services/appointmentFilters";
import {
  ADMIN_APPOINTMENTS_KEY,
  fetchAppointmentPage,
  updateAppointmentStatus,
  type Appointment,
  type AppointmentPageParams,
  type AppointmentSort,
  type AppointmentStatus,
} from "@/services/appointmentService";
import { getProofState, isProofOverdue } from "@/services/proofState";

/** The status filter; the page can open on one (the dashboard links here): `?status=PENDING` */
const STATUS_OPTIONS: { label: string; value: AppointmentFilterStatus }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Awaiting proof", value: "AWAITING_PROOF" },
  { label: "Proofs to review", value: "PROOF_PENDING" },
  { label: "Proof overdue", value: "PROOF_OVERDUE" },
  { label: "Awaiting confirmation", value: "AWAITING_CONFIRMATION" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Refunded", value: "REFUNDED" },
];

export const parseStatusParam = (value: string | null): AppointmentFilterStatus =>
  STATUS_OPTIONS.find((option) => option.value === value)?.value ?? "ALL";

const SORT_OPTIONS = ["Upcoming First", "Latest First", "Recently Booked", "Oldest Booked"];

// Each sort as the server names it (by appointment date and time, or by when it was booked)
const SORT_PARAM: Record<string, AppointmentSort> = {
  "Upcoming First": "upcoming",
  "Latest First": "latest",
  "Recently Booked": "booked_newest",
  "Oldest Booked": "booked_oldest",
};

// Five to a page, like the dashboard's bookings table
const ROWS_PER_PAGE = 5;

const STATUSES: AppointmentStatus[] = ["PENDING", "AWAITING_PROOF", "AWAITING_CONFIRMATION", "CONFIRMED", "COMPLETED", "CANCELLED", "REFUNDED"];

// Dot beside each status, so the colour says what it means before you read it
const statusDotClass = (status: AppointmentStatus) => {
  switch (status) {
    case "PENDING":
    case "AWAITING_PROOF":
    case "AWAITING_CONFIRMATION":
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

// The proof badge beside a client: a proof to review, or one that's overdue
// A proof waiting for review is a button: it opens the review (the client page has no proof review)
function ProofBadge({ appointment, now, onReview }: { appointment: Appointment; now: number; onReview: () => void }) {
  const kind = isProofOverdue(appointment, now) ? "overdue" : getProofState(appointment, now).kind;
  if (kind === "overdue") return <span className="whitespace-nowrap rounded-md bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger-ink">Proof overdue</span>;
  if (kind === "in_review")
    return (
      <button
        type="button"
        onClick={onReview}
        aria-label={`Review the payment proof for appointment #${appointment.id}`}
        className="whitespace-nowrap rounded-md bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-crimson"
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

  const queryClient = useQueryClient();
  const { isLoaded: isAuthLoaded } = useAuth();
  // The artist filter's list (shared with the Artists editor); without it the filter lists no artists
  const artistList = useQuery(adminQueries.nailists()).data;
  const artists = (Array.isArray(artistList) ? artistList : []) as unknown as NailArtist[];
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
  const [firstRender] = useState(() => Date.now());
  // The search asks the server once typing pauses
  const search = useDebouncedValue(query.trim());
  const pageSize = asTable ? ROWS_PER_PAGE : CARDS_PER_PAGE;

  // One page from the server (it used to send every appointment to show five). "Proof overdue"
  // needs a proof deadline the database doesn't store, so, as before, it matches nothing.
  const proofOverdue = status === "PROOF_OVERDUE";
  const [lastTotal, setLastTotal] = useState(0);
  const pages = Math.max(1, Math.ceil(lastTotal / pageSize));
  const params: AppointmentPageParams = {
    // A list that shrank (a status changed) keeps you on its last page rather than past it
    page: Math.min(page, pages),
    pageSize,
    statuses: status === "ALL" || status === "PROOF_PENDING" || proofOverdue ? STATUSES : [status],
    proofToReview: status === "PROOF_PENDING",
    artist: artist === "All" ? undefined : artist,
    search,
    sort: SORT_PARAM[sort],
  };
  const listQuery = useQuery({
    queryKey: [...ADMIN_APPOINTMENTS_KEY, params],
    queryFn: async () => fetchAppointmentPage(params, await getToken(), currentUser?.id),
    enabled: isAuthLoaded && !proofOverdue,
    // The page on screen stays (and a failed refresh keeps it) until the next one arrives
    placeholderData: keepPreviousData,
    // Refreshes every 30 seconds, only while this tab is on screen
    refetchInterval: 30_000,
  });
  // The previous page shows while another loads; if that load fails it has no data, and the error shows
  const result = proofOverdue ? { rows: [], total: 0 } : listQuery.data;
  if (result && result.total !== lastTotal) setLastTotal(result.total);
  const appointments: Appointment[] | null = result ? result.rows : null;
  const failed = listQuery.isError;
  // The time the proof badges are worked out against: when this page was loaded
  const now = listQuery.dataUpdatedAt || firstRender;

  // After a change: every page, the dashboard, the schedule and the client pages load again
  const refresh = () => adminDataChanged(queryClient);
  const load = () => void listQuery.refetch();

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
      void refresh();
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

  const q = query.trim();
  const shown = appointments ?? [];
  const view = pageView(shown, params.page, pageSize, result?.total ?? 0);

  const clientFacts = (a: Appointment) => {
    const profile = isWalkin(a) ? undefined : clients[a.user_id];
    return {
      profile,
      phone: a.phone?.trim() || "–",
      joined: monthYear(profile?.joinedAt) || "–",
      lastActive: relativeDay(profile?.lastSignInAt) || "–",
      visits: isWalkin(a) ? "–" : String(a.client_visits ?? 0),
    };
  };

  const clientCell = (a: Appointment, size: "row" | "card") => {
    const name = clientName(a);
    const { profile } = clientFacts(a);
    const box = size === "row" ? "h-9 w-9" : "h-10 w-10";
    return (
      <span className="flex min-w-0 items-center gap-3">
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
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-gray-red">
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
      className="w-37.5"
      triggerClassName="h-8! px-3! py-0! text-xs"
    />
  );
  // Manage opens the client's page; a walk-in has none, so theirs is turned off
  const manageButton = (a: Appointment, withLabel = false) => {
    const look = clsx(
      "inline-flex items-center justify-center gap-3 rounded-lg bg-berry text-pearl transition-colors",
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
    <section id="appointments" aria-label="Appointments" className="flex min-w-0 scroll-mt-3 flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-3 shadow-petal sm:p-6">
      {/* One row at every width; on a phone the button drops its icon to fit */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate font-display text-2xl font-normal text-gray-red">Appointments</h2>
        <Button size="sm" type="button" onClick={() => setCreating(true)} className="shrink-0 whitespace-nowrap">
          <Plus size={14} aria-hidden="true" className="hidden sm:block" />
          New appointment
        </Button>
      </div>

      {/* One row from md (the filters and the search share it, giving way rather than wrapping); a column below */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {asTable ? (
          filters.map((filter) => (
            <Select
              key={filter.key}
              aria-label={filter.title}
              value={filter.value}
              onChange={(e) => filter.pick(e.target.value)}
              options={filter.options}
              className={clsx("min-w-0 flex-1", filter.key === "artist" ? "max-w-40" : "max-w-44")}
              triggerClassName="h-9! py-0! text-[13px]"
            />
          ))
        ) : (
          // Phone: the three filters in one row, each opening its options in a bottom drawer
          <div className="grid w-full grid-cols-3 gap-3">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                aria-label={`${filter.title}: ${filter.options.find((o) => o.value === filter.value)?.label}`}
                onClick={() => setOpenFilter(filter.key)}
                className="flex h-9 min-w-0 items-center justify-between gap-1 rounded-md border border-crimson-light bg-milk px-3 text-sm text-gray-red focus-visible:outline-2 focus-visible:outline-crimson"
              >
                <span className="min-w-0 truncate">{filter.options.find((o) => o.value === filter.value)?.label}</span>
                <ChevronDown size={14} aria-hidden="true" className="shrink-0 text-crimson" />
              </button>
            ))}
          </div>
        )}
        <label className="relative w-full md:ml-auto md:w-72 md:min-w-40">
          <span className="sr-only">Search appointments</span>
          <input
            type="search"
            aria-label="Search appointments"
            value={query}
            onChange={(e) => choose(setQuery)(e.target.value)}
            placeholder="Search client, service, artist, ID…"
            className="h-9 w-full rounded-full border border-crimson-light bg-milk pl-3 pr-9 text-[13px] text-gray-red outline-none placeholder:text-gray-red/60 focus:ring-2 focus:ring-crimson"
          />
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-red" />
        </label>
      </div>

      {!asTable &&
        filters.map((filter) => (
          <Dialog key={filter.key} open={openFilter === filter.key} title={filter.title} onClose={() => setOpenFilter(null)}>
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
                        "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors",
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
          </Dialog>
        ))}

      {failed && appointments === null ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-red">
          We couldn&apos;t load the appointments.
          <Button type="button" variant="secondary" onClick={load}>
            Try again
          </Button>
        </div>
      ) : appointments === null ? (
        <ListSkeleton label="Loading appointments" columns={9} />
      ) : shown.length === 0 ? (
        <p className="text-sm text-gray-red">{q || artist !== "All" ? "No appointments match your search." : status === "ALL" ? "No appointments yet." : "No appointments with this status."}</p>
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
              <div className="flex items-center gap-3 text-xs text-gray-red">
                Payment screenshot <ProofThumb proof={a.latest_proof} appointmentId={a.id} />
              </div>
              <div className="flex items-center justify-between gap-3">
                {statusSelect(a)}
                {manageButton(a, true)}
              </div>
            </RowCard>
          ))}
        </RowCards>
      ) : (
        <TableFrame label="Appointments" minWidthClass="min-w-320"
          head={
            <tr className="text-left text-xs text-gray-red">
              {["Client", "Phone", "Joined", "Last active", "Visits", "Service", "Artist", "Date", "Time", "Proof", "Status", "Manage"].map((h) => (
                <th key={h} scope="col" className={clsx("pb-2 pr-3 font-medium", h === "Manage" && "pr-0 text-center", h === "Visits" && "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          }
        >
        {view.rows.map((a) => {
          const facts = clientFacts(a);
          const cell = "border-t border-dotted border-crimson-light py-3 pr-3";
          return (
            <tr key={a.id}>
              <th scope="row" className={clsx(cell, "max-w-60 text-left font-normal")}>
                {clientCell(a, "row")}
              </th>
              <td className={clsx(cell, "whitespace-nowrap")}>{facts.phone}</td>
              <td className={clsx(cell, "whitespace-nowrap")}>{facts.joined}</td>
              <td className={clsx(cell, "whitespace-nowrap")}>{facts.lastActive}</td>
              <td className={clsx(cell, "text-right font-bold")}>{facts.visits}</td>
              <td className={cell}>
                {a.service_name || "–"}
                <span className="block text-xs text-gray-red">#{a.id}</span>
              </td>
              <td className={cell}>{a.nailist_name || "–"}</td>
              <td className={clsx(cell, "whitespace-nowrap")}>{dateLabel(a.appointment_date)}</td>
              <td className={clsx(cell, "whitespace-nowrap")}>{a.appointment_time || "–"}</td>
              <td className={cell}>
                <ProofThumb proof={a.latest_proof} appointmentId={a.id} />
              </td>
              <td className={cell}>{statusSelect(a)}</td>
              <td className={clsx(cell, "pr-0 text-center")}>{manageButton(a)}</td>
            </tr>
          );
        })}
        </TableFrame>
      )}

      {appointments !== null && <Pagination page={view.current} totalPages={view.pages} onPageChange={setPage} summary={view} />}

      {creating && (
        <CreateAppointmentDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void refresh();
            toast.show("success", "Appointment created", "The walk-in appointment was added and now shows in the list.");
          }}
        />
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
            await refresh();
          }}
        />
      )}

      {/* After the drawer, so it stacks above it */}
      <AlertDialog
        open={slotTaken}
        title="Slot already taken"
        message="This appointment slot has already been taken by another active appointment."
        buttonText="Okay"
        onClose={() => setSlotTaken(false)}
        onAction={() => setSlotTaken(false)}
      />
    </section>
  );
}
