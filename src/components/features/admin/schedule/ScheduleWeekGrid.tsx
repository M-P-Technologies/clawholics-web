import { timeRangeLabel } from "@/lib/timeFormat";
import clsx from "clsx";
import { scheduleClientName, sortByStartTime, toDateKey } from "@/services/scheduleAgenda";
import type { MonthlySchedule, NailArtist, ScheduleAppointment } from "@/services/scheduleService";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Group = "confirmed" | "pending" | "completed" | "cancelled";
const GROUP_OF: Record<string, Group> = {
  CONFIRMED: "confirmed",
  PENDING: "pending",
  AWAITING_PROOF: "pending",
  AWAITING_CONFIRMATION: "pending",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  CANCELED: "cancelled",
  REFUNDED: "cancelled",
};
const groupOf = (status: string): Group => GROUP_OF[(status ?? "").trim().toUpperCase()] ?? "pending";

// Each status has its own tint and a stronger edge, so a block reads at a glance; the legend
// and each block's label say it in words too
const BLOCK: Record<Group, string> = {
  confirmed: "border-berry bg-crimson-light/45",
  pending: "border-[#b87a12] bg-[#fbeed6]",
  completed: "border-[#2f9468] bg-[#e1f1e8]",
  cancelled: "border-[#9a8a86] bg-[#efe9e6] text-gray-red line-through",
};
const SWATCH: Record<Group, string> = {
  confirmed: "bg-berry",
  pending: "bg-[#b87a12]",
  completed: "bg-[#2f9468]",
  cancelled: "bg-[#9a8a86]",
};
const LEGEND: [Group, string][] = [
  ["confirmed", "Confirmed"],
  ["pending", "Pending"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
];

const artistName = (artist: NailArtist) => artist.name || `${artist.first_name ?? ""} ${artist.last_name ?? ""}`.trim() || "Artist";

interface ScheduleWeekGridProps {
  /** Monday to Sunday */
  days: Date[];
  schedule: MonthlySchedule;
  todayKey: string;
  /** Matches a client's name or a service */
  query: string;
  /** A service name, or "All" */
  service: string;
  /** An artist's name, or "All" */
  artist: string;
  onOpen: (appointment: ScheduleAppointment) => void;
  onOpenDay: (dateKey: string) => void;
}

// The week at a glance: artists down the side, the days across, each booking a block in its
// artist's day, coloured by status, and days off shaded. A block opens the appointment; a day's
// heading opens that day.
export default function ScheduleWeekGrid({ days, schedule, todayKey, query, service, artist, onOpen, onOpenDay }: ScheduleWeekGridProps) {
  const q = query.trim().toLowerCase();
  const keys = days.map(toDateKey);
  const artists = schedule.nailists.filter((a) => artist === "All" || artistName(a) === artist);

  const bookings = (artistId: number, dateKey: string) =>
    sortByStartTime(
      schedule.appointments.filter(
        (a) =>
          Number(a.nailist_id) === Number(artistId) &&
          a.appointment_date === dateKey &&
          (service === "All" || a.service_name === service) &&
          (!q || scheduleClientName(a).toLowerCase().includes(q) || (a.service_name ?? "").toLowerCase().includes(q)),
      ),
    );

  const isDayOff = (artistId: number, date: Date, dateKey: string) =>
    schedule.dayOffs.some(
      (d) =>
        Number(d.nailist_id) === Number(artistId) &&
        ((d.day_off_type === "REGULAR" && Number(d.day_of_week) === date.getDay()) || (d.day_off_type === "CUSTOM" && d.date === dateKey)),
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-crimson-light/40 bg-milk shadow-petal">
        <table aria-label="Week schedule" className="w-full min-w-225 table-fixed border-separate border-spacing-0 text-sm text-gray-red">
          <thead className="sticky top-0 z-20 bg-milk">
            <tr>
              <th scope="col" className="sticky left-0 z-30 w-44 border-b border-crimson-light/60 bg-milk px-3 py-3 text-left text-xs font-medium text-gray-red">
                Artist
              </th>
              {days.map((date, i) => {
                const isToday = keys[i] === todayKey;
                return (
                  <th key={keys[i]} scope="col" className={clsx("border-b border-l border-crimson-light/60 px-1 py-2 font-normal", isToday && "bg-crimson-light/30")}>
                    <button
                      type="button"
                      aria-label={`Open ${DAY_NAMES[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`}
                      onClick={() => onOpenDay(keys[i])}
                      className="flex w-full flex-col items-center rounded-lg py-0.5 hover:bg-crimson-light/30 focus-visible:outline-2 focus-visible:outline-crimson"
                    >
                      <span className={clsx("text-xs font-bold", isToday ? "text-berry" : "text-gray-red")}>{DAY_NAMES[date.getDay()].slice(0, 3)}</span>
                      <span className={clsx("text-xs", isToday ? "text-berry" : "text-gray-red")}>{date.getDate()}</span>
                      {isToday && <span className="text-[10px] font-bold text-berry">Today</span>}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {artists.map((a) => {
              const name = artistName(a);
              return (
                <tr key={a.id}>
                  <th scope="row" className="sticky left-0 z-10 border-b border-crimson-light/40 bg-milk px-3 py-3 text-left align-top font-normal">
                    <span className="flex items-center gap-3">
                      <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-crimson-light/50 font-display text-base text-berry">
                        {name.replace(/^Miss\s+/i, "").charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 truncate font-bold">{name}</span>
                    </span>
                  </th>
                  {days.map((date, i) => {
                    const key = keys[i];
                    const off = isDayOff(a.id, date, key);
                    const items = bookings(a.id, key);
                    const label = off && items.length === 0
                      ? `${DAY_NAMES[date.getDay()]}: day off`
                      : `${DAY_NAMES[date.getDay()]}: ${items.length === 0 ? "no bookings" : `${items.length} ${items.length === 1 ? "booking" : "bookings"}`}${off ? ", day off" : ""}`;
                    return (
                      <td
                        key={key}
                        aria-label={label}
                        className={clsx(
                          "h-20 border-b border-l border-crimson-light/40 p-1 align-top",
                          off && "bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(232,170,190,0.25)_6px_8px)]",
                          !off && key === todayKey && "bg-crimson-light/15",
                        )}
                      >
                        {off && items.length === 0 ? (
                          <span className="block pt-2 text-center text-xs font-medium text-gray-red">Day off</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {items.map((b) => {
                              const group = groupOf(b.status);
                              const client = scheduleClientName(b);
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  data-status={group}
                                  aria-label={`${client}, ${b.service_name}, ${timeRangeLabel(b.appointment_time)}, ${group}`}
                                  onClick={() => onOpen(b)}
                                  className={clsx(
                                    "w-full rounded-md border-l-[3px] px-1.5 py-1 text-left transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-crimson",
                                    BLOCK[group],
                                  )}
                                >
                                  <span className="block truncate text-xs font-bold leading-tight">{client}</span>
                                  <span className="block truncate text-[10px] leading-tight opacity-80">{b.service_name}</span>
                                  <span className="block truncate text-[10px] leading-tight opacity-80">{timeRangeLabel(b.appointment_time)}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        {artists.length === 0 && <p className="px-3 py-6 text-sm text-gray-red">No artists to show.</p>}
      </div>

      <ul aria-label="Legend" className="flex flex-wrap gap-x-6 gap-y-1 rounded-2xl bg-milk px-3 py-3 text-xs text-gray-red shadow-petal">
        {LEGEND.map(([group, label]) => (
          <li key={group} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={clsx("h-3 w-1 rounded-full", SWATCH[group])} />
            {label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-3 w-4 rounded-sm bg-[repeating-linear-gradient(135deg,transparent_0_3px,rgba(232,170,190,0.6)_3px_4px)]" />
          Day off
        </li>
      </ul>
    </div>
  );
}
