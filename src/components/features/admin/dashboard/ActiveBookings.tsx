import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Link } from "@/lib/router";
import { manilaClock, manilaToday } from "@/lib/dashboardPeriods";
import { ADMIN_APPOINTMENTS_KEY, type Appointment } from "@/services/appointmentService";
import type { BookingsLoader } from "@/hooks/admin/useReports";
import { SectionSkeleton } from "@/components/features/admin/skeletons/skeletons";

const SHOWN = ["CONFIRMED", "COMPLETED"];
const MAX_SHOWN = 3;
/** More than a day ever holds */
const DAY_LIMIT = 50;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const dayLabel = (ymd: string) => {
  const date = new Date(`${ymd}T00:00:00Z`);
  return `${DAYS[date.getUTCDay()]}, ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
};
// "13:00" → "1:00 PM"
const clock = (hhmm: string) => {
  const [h, m] = hhmm.trim().split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m ?? 0).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
const range = (time: string) => {
  const [start, end] = time.split("-").map((t) => t.trim().padStart(5, "0"));
  return { start, end: end ?? start };
};

// Today's bookings at a glance: who is in, with whom, and when; the one in the chair now is
// marked. Confirmed and completed only (not cancelled, nor still waiting for payment).
export default function ActiveBookings({ load }: { load: BookingsLoader }) {
  const now = new Date();
  const today = manilaToday(now);
  const time = manilaClock(now);
  // Only today's confirmed and completed bookings, in time order, from the server
  const params = { page: 1, pageSize: DAY_LIMIT, on: today, statuses: SHOWN, sort: "upcoming" } as const;
  const day = useQuery({
    queryKey: [...ADMIN_APPOINTMENTS_KEY, "today", params],
    queryFn: () => load({ ...params, statuses: [...SHOWN] }),
  });
  const rows: Appointment[] | null = day.data?.rows ?? null;
  const failed = day.isError && !day.data;
  const todays = rows ?? [];
  const isDone = (a: Appointment) => (a.status ?? "").trim().toUpperCase() === "COMPLETED" || range(a.appointment_time).end <= time;
  // The top three: the one in the chair and the next ones first; finished ones (the latest
  // first) only fill the rest. Shown in time order, the others behind a link to the schedule.
  const stillToCome = todays.filter((a) => !isDone(a));
  const finished = todays.filter(isDone).reverse();
  const picked = new Set([...stillToCome, ...finished].slice(0, MAX_SHOWN));
  const shown = todays.filter((a) => picked.has(a));
  const more = todays.length - shown.length;

  return (
    <section aria-label="Active bookings" className="flex min-w-0 flex-col gap-3 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-normal text-gray-red">Active bookings</h2>
        <span className="text-[12px] text-gray-red/70">{dayLabel(today)}</span>
      </div>
      {failed ? (
        <p className="text-sm text-gray-red/70">We couldn&apos;t load today&apos;s bookings.</p>
      ) : rows === null ? (
        <SectionSkeleton label="Loading today's bookings" lines={4} />
      ) : todays.length === 0 ? (
        <p className="text-sm text-gray-red/70">No bookings today.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((a) => {
            const { start, end } = range(a.appointment_time);
            const done = isDone(a);
            const current = !done && start <= time && time < end;
            return (
              <li
                key={a.id}
                className={clsx(
                  "flex items-start justify-between gap-3 rounded-xl border-l-4 px-3 py-2.5",
                  current ? "border-berry bg-crimson-light/40" : done ? "border-crimson-light bg-light-orange/40 opacity-75" : "border-crimson bg-crimson-light/20",
                )}
              >
                <span className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-gray-red">{`${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Client"}</p>
                  <span className="block truncate text-[12px] text-gray-red/80">{a.service_name}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="flex items-center justify-end gap-1.5">
                    {current && <span className="rounded-full bg-berry px-2 py-0.5 text-[10px] font-bold text-pearl">Now</span>}
                    {done && <span className="rounded-full bg-sand px-2 py-0.5 text-[10px] font-bold text-gray-red">Done</span>}
                    <span className="text-[13px] font-bold text-gray-red">{a.nailist_name}</span>
                  </span>
                  <span className="block whitespace-nowrap text-[12px] text-gray-red/80">{`${clock(start)} – ${clock(end)}`}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {more > 0 && (
        <Link to="/schedule" className="self-start text-[13px] font-bold text-berry underline decoration-crimson-light underline-offset-4">
          {`+${more} more today`}
        </Link>
      )}
    </section>
  );
}
