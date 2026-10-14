import { useState, type ChangeEvent } from "react";
import { Button, Select } from "@/components/atoms";
import { SegmentedControl } from "@/components/molecules";
import AppointmentCard, { isCompleted } from "./AppointmentCard";
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
  /** The appointments the client has reviewed */
  reviewedIds: ReadonlySet<number>;
}

// Upcoming | Past switch over a list of appointment cards.
export default function AppointmentsSection(props: AppointmentsSectionProps) {
  const { upcoming, past, photoFor, highlightedId, onOpen, reviewedIds } = props;
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <section aria-label="Appointments" className="flex flex-col gap-4">
      <SegmentedControl
        label="Which appointments"
        fill
        className="self-start max-sm:w-full"
        options={[
          { value: "upcoming", label: "Upcoming", count: upcoming.length },
          { value: "past", label: "Past", count: past.length },
        ]}
        value={tab}
        onChange={setTab}
      />

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
