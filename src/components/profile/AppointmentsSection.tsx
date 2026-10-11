import { useState, type ChangeEvent } from "react";
import clsx from "clsx";
import Button from "../ui/Button";
import Select from "../ui/Select";
import AppointmentCard from "./AppointmentCard";
import type { AppointmentView } from "./types";

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
}

// Upcoming | Past switch over a list of appointment cards.
export default function AppointmentsSection(props: AppointmentsSectionProps) {
  const { upcoming, past, photoFor, highlightedId, onOpen } = props;
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
        "flex-1 rounded-md py-3 text-center text-sm font-bold uppercase tracking-extrawide transition-colors",
        tab === id ? "bg-crimson text-light-orange shadow-md shadow-crimson/30" : "text-gray-red hover:text-crimson",
      )}
    >
      {label} ({count})
    </Button>
  );

  return (
    <section aria-label="Appointments" className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-1 rounded-md border border-crimson-light bg-light-orange p-1">
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
        <p className="rounded-sm border border-crimson-light/80 bg-light-orange p-4 copy-body">
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
