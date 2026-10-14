import { CalendarClock } from "lucide-react";
import { clientInfoRows, dateLabel } from "../../../lib/admin/clientPage";
import type { ClientAppointment, ClientDetails } from "../../../services/clientNotesService";
import { initialsOf } from "@/components/atoms";

interface ClientProfilePanelProps {
  name: string;
  details: ClientDetails;
  nextAppointment?: ClientAppointment;
}

// The client page's left panel: who they are, their next visit, and their details
export default function ClientProfilePanel({ name, details, nextAppointment }: ClientProfilePanelProps) {
  const { stamps } = details.summary;
  return (
    <aside aria-label="Client profile" className="flex min-w-0 flex-col gap-5 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal lg:h-[80vh] lg:overflow-y-auto">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-2xl text-berry">
          {initialsOf(name)}
        </span>
        <div className="min-w-0">
          <h2 className="break-words font-display text-2xl font-normal leading-tight text-gray-red">{name}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-crimson-light/50 px-2.5 py-0.5 text-[11px] font-bold text-berry">Client</span>
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-[11px] font-bold text-gray-red">
              {stamps} {stamps === 1 ? "stamp" : "stamps"}
            </span>
          </div>
        </div>
      </div>

      {/* The next visit, highlighted */}
      <div className="flex flex-col gap-1 rounded-xl border border-crimson-light/60 bg-light-orange/40 p-4">
        <p className="flex items-center justify-between text-[12px] text-gray-red/70">
          Next visit
          <CalendarClock size={14} aria-hidden="true" className="text-berry" />
        </p>
        {nextAppointment ? (
          <>
            <p className="font-display text-xl text-berry">{dateLabel(nextAppointment.appointment_date)}</p>
            <p className="text-[13px] text-gray-red/80">
              {nextAppointment.appointment_time} · {nextAppointment.service_name} with {nextAppointment.nailist_name}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-gray-red/70">Nothing booked ahead.</p>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-crimson-light/50 pt-4">
        <h3 className="font-display text-lg font-normal text-gray-red">Client info</h3>
        <dl className="flex flex-col gap-3">
          {clientInfoRows(details).map(({ label, value, Icon }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-[12px] text-gray-red/70">{label}</dt>
              <dd className="flex min-w-0 items-center gap-2 text-sm font-medium text-gray-red">
                <Icon className="h-4 w-4 shrink-0 text-berry" />
                <span className="min-w-0 break-words">{value}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
