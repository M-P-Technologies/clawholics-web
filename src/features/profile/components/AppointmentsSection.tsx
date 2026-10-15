import { useState, type ChangeEvent } from "react";
import clsx from "clsx";
import Button from "../../../components/ui/Button";
import Select from "../../../components/ui/Select";
import AppointmentCard, { isCompleted } from "./AppointmentCard";
import type { AppointmentView } from "../types";

interface AppointmentsSectionProps {
  upcoming: AppointmentView[];
  past: AppointmentView[];
  photoFor: (serviceName: string) => string;
  highlightedId: number | null;
  onOpen: (view: AppointmentView) => void;
  historyFilter: string;
  onFilterChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  historySort: string;
  onSortChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  hasMore: boolean;
  showAll: boolean;
  onToggleAll: () => void;
  /** The appointments the client has reviewed */
  reviewedIds: ReadonlySet<number>;
}

// Upcoming | Past switch over a list of appointment cards.
export default function AppointmentsSection(props: AppointmentsSectionProps) {
  const { upcoming, past, photoFor, highlightedId, onOpen, reviewedIds } = props;
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const list = tab === "upcoming" ? upcoming : past;

  const tabButton = (id: "upcoming" | "past", label: string, count: number) => (
    <Button
      variant="bare"
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={clsx(
        "flex-1 rounded-full px-4 py-1.5 text-center text-[13px] font-bold transition-colors sm:flex-none",
        tab === id ? "bg-milk text-berry shadow-sm" : "text-gray-red/80 hover:text-berry",
      )}
    >
      {label} ({count})
    </Button>
  );

  return (
    <section aria-label="Appointments" className="flex flex-col gap-4">
      <div role="tablist" aria-label="Which appointments" className="flex gap-1 self-start rounded-full bg-crimson-light/25 p-1 max-sm:w-full">
        {tabButton("upcoming", "Upcoming", upcoming.length)}
        {tabButton("past", "Past", past.length)}
      </div>

      {tab === "past" && (
        <div className="flex flex-wrap gap-2">
          <Select aria-label="Filter past appointments" value={props.historyFilter} onChange={props.onFilterChange} className="w-full sm:w-48">
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </Select>
          <Select aria-label="Sort past appointments" value={props.historySort} onChange={props.onSortChange} className="w-full sm:w-56">
            <option value="appointmentDateDesc">Appt Date (Newest)</option>
            <option value="appointmentDateAsc">Appt Date (Oldest)</option>
            <option value="bookingDateDesc">Recently Booked</option>
          </Select>
        </div>
      )}

      {list.length === 0 ? (
        <p className="rounded-xl bg-crimson-light/15 px-4 py-6 text-center text-[13px] text-gray-red/70">
          {tab === "upcoming" ? "Nothing coming up yet." : "No past appointments to show."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((view) => (
            <AppointmentCard
              key={view.appt.id}
              view={view}
              photo={photoFor(view.appt.service_name)}
              highlighted={view.appt.id === highlightedId}
              awaitingReview={isCompleted(view) && !reviewedIds.has(view.appt.id)}
              onOpen={() => onOpen(view)}
            />
          ))}
        </div>
      )}

      {tab === "past" && props.hasMore && (
        <Button type="button" variant="secondary" onClick={props.onToggleAll} className="w-full sm:w-auto sm:self-center">
          {props.showAll ? "View less" : "View more"}
        </Button>
      )}
    </section>
  );
}
