import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import type { AppointmentFilterStatus } from "../../services/appointmentFilters";
import Button from "../ui/Button";
import Select from "../ui/Select";
import Sheet from "../ui/Sheet";

export const STATUS_OPTIONS: { label: string; value: AppointmentFilterStatus }[] = [
  { label: "All Appointments", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Awaiting Proof", value: "AWAITING_PROOF" },
  { label: "Proofs To Review", value: "PROOF_PENDING" },
  { label: "Proof Overdue", value: "PROOF_OVERDUE" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Refunded", value: "REFUNDED" },
];

// The Appointments screen can open on a filter (the dashboard links here): `?status=PENDING`
export const parseStatusParam = (value: string | null): AppointmentFilterStatus =>
  STATUS_OPTIONS.find((option) => option.value === value)?.value ?? "ALL";

export const SORT_OPTIONS = ["Upcoming First", "Latest First", "Recently Booked", "Oldest Booked"];
export const DEFAULT_SORT = "Upcoming First";

// On a phone the common statuses are chips; the rest live in the Filter sheet
const CHIP_STATUSES: AppointmentFilterStatus[] = ["ALL", "PENDING", "AWAITING_PROOF", "PROOF_PENDING", "CONFIRMED", "COMPLETED"];
const SHEET_STATUSES: AppointmentFilterStatus[] = ["PROOF_OVERDUE", "CANCELLED", "REFUNDED"];

const labelOf = (value: AppointmentFilterStatus) => STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
const chipLabel = (value: AppointmentFilterStatus) => {
  if (value === "ALL") return "All";
  const label = labelOf(value);
  return label.charAt(0) + label.slice(1).toLowerCase();
};

const chipClass = (active: boolean) =>
  clsx(
    "shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors",
    active ? "border-crimson bg-crimson text-light-orange" : "border-crimson-light text-gray-red hover:border-crimson",
  );

const searchClass =
  "h-10 min-w-0 flex-1 rounded-full border border-crimson-light bg-milk px-4 text-sm text-gray-red outline-none placeholder:text-gray-red/60 focus:ring-2 focus:ring-crimson";

interface AppointmentFiltersProps {
  status: AppointmentFilterStatus;
  onStatus: (value: AppointmentFilterStatus) => void;
  artist: string;
  onArtist: (value: string) => void;
  sort: string;
  onSort: (value: string) => void;
  search: string;
  onSearch: (value: string) => void;
  artistNames: string[];
  /** Called when the artist list is about to be used, so the screen can load it */
  onLoadArtists?: () => void;
}

export default function AppointmentFilters({
  status,
  onStatus,
  artist,
  onArtist,
  sort,
  onSort,
  search,
  onSearch,
  artistNames,
  onLoadArtists,
}: AppointmentFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  // `base` is the status the sheet was opened with, which un-picking a rare status goes back to
  const [draft, setDraft] = useState({ status, artist, sort, base: status });

  const filtersActive = artist !== "All" || sort !== DEFAULT_SORT || SHEET_STATUSES.includes(status);

  const openSheet = () => {
    onLoadArtists?.();
    setDraft({ status, artist, sort, base: status });
    setSheetOpen(true);
  };
  const apply = () => {
    onStatus(draft.status);
    onArtist(draft.artist);
    onSort(draft.sort);
    setSheetOpen(false);
  };
  const clear = () => {
    onStatus("ALL");
    onArtist("All");
    onSort(DEFAULT_SORT);
    setSheetOpen(false);
  };

  return (
    <>
      {/* PHONE: chips, search, Filter button */}
      <div role="group" aria-label="Filters (phone)" className="flex flex-col gap-3 lg:hidden">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {CHIP_STATUSES.map((value) => (
            <Button
              key={value}
              variant="bare"
              type="button"
              aria-pressed={status === value}
              onClick={() => onStatus(value)}
              className={chipClass(status === value)}
            >
              {chipLabel(value)}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="search"
            aria-label="Search by appointment ID"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search by appointment ID..."
            className={searchClass}
          />
          <Button variant="secondary" type="button" onClick={openSheet} className="relative !px-3 !py-2">
            <SlidersHorizontal size={16} aria-hidden="true" />
            Filter
            {filtersActive && (
              <span data-testid="filter-dot" aria-hidden="true" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-crimson" />
            )}
          </Button>
        </div>
      </div>

      {/* DESKTOP: the dropdowns, as before */}
      <div role="group" aria-label="Filters (desktop)" className="hidden flex-wrap items-center gap-x-4 gap-y-1 pl-4 lg:flex">
        <div className="flex items-center gap-2">
          <span className="text-[14px] text-gray-red">Filter by</span>
          <Select className="w-40" aria-label="Status" value={status} onChange={(e) => onStatus(e.target.value as AppointmentFilterStatus)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[14px] text-gray-red">Filter by</span>
          <Select
            className="w-40"
            aria-label="Artist"
            value={artist}
            onFocus={onLoadArtists}
            onClick={onLoadArtists}
            onChange={(e) => onArtist(e.target.value)}
          >
            <option value="All">All Artists</option>
            {artistNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>

        <input
          type="search"
          aria-label="Search by appointment ID"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by appointment ID..."
          className="h-6 w-[250px] rounded-md bg-milk/80 px-4 text-[13px] text-gray-red outline-none placeholder:text-gray-red focus:ring-2 focus:ring-crimson lg:ml-auto"
        />
      </div>

      <Sheet open={sheetOpen} title="Filter appointments" onClose={() => setSheetOpen(false)}>
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-red/80">More statuses</p>
          <div className="flex flex-wrap gap-2">
            {SHEET_STATUSES.map((value) => (
              <Button
                key={value}
                variant="bare"
                type="button"
                aria-pressed={draft.status === value}
                onClick={() => setDraft((d) => ({
                    ...d,
                    status: d.status !== value ? value : SHEET_STATUSES.includes(d.base) ? "ALL" : d.base,
                  }))}
                className={chipClass(draft.status === value)}
              >
                {chipLabel(value)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-red/80">Artist</p>
          <Select aria-label="Artist" value={draft.artist} onChange={(e) => setDraft((d) => ({ ...d, artist: e.target.value }))}>
            <option value="All">All Artists</option>
            {artistNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-red/80">Sort by</p>
          <Select aria-label="Sort by" value={draft.sort} onChange={(e) => setDraft((d) => ({ ...d, sort: e.target.value }))}>
            {SORT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" type="button" fullWidth onClick={clear}>
            Clear
          </Button>
          <Button type="button" fullWidth onClick={apply}>
            Apply
          </Button>
        </div>
      </Sheet>
    </>
  );
}
