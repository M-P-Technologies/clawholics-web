import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { useTableLayout } from "../../../hooks/useMinWidth";
import { percent } from "../../../lib/dashboardFormat";
import { addDays, manilaToday, resolvePeriod } from "../../../lib/dashboardPeriods";
import type { Utilization, UtilizationDay } from "../../../services/dashboardTypes";
import { Avatar, Button } from "@/components/atoms";
import { CARDS_PER_PAGE, RowCard, RowCards } from "@/components/organisms";
import { Pagination, paginate } from "@/components/molecules";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const parts = (ymd: string) => ({ year: Number(ymd.slice(0, 4)), month: MONTHS[Number(ymd.slice(5, 7)) - 1], day: Number(ymd.slice(8, 10)) });

// "Oct 12 – 18, 2026", "Sep 28 – Oct 4, 2026", or "Dec 28, 2026 – Jan 3, 2027"
function weekLabel(from: string, to: string) {
  const a = parts(from);
  const b = parts(to);
  if (a.year !== b.year) return `${a.month} ${a.day}, ${a.year} – ${b.month} ${b.day}, ${b.year}`;
  if (a.month !== b.month) return `${a.month} ${a.day} – ${b.month} ${b.day}, ${b.year}`;
  return `${a.month} ${a.day} – ${b.day}, ${b.year}`;
}

const mondayOf = (ymd: string) => resolvePeriod("week", ymd).period.from;

// What a cell says to a screen reader, and what it shows
function describe(day: UtilizationDay, dayName: string) {
  if (day.off) {
    return day.booked > 0
      ? { label: `${dayName}: day off, ${day.booked} booked anyway`, text: `${day.booked} booked` }
      : { label: `${dayName}: day off`, text: "Off" };
  }
  if (day.offered === 0) {
    return { label: `${dayName}: no slots${day.booked > 0 ? `, ${day.booked} booked` : ""}`, text: day.booked > 0 ? `${day.booked} booked` : "–" };
  }
  return { label: `${dayName}: ${day.booked} of ${day.offered} slots booked`, text: `${day.booked}/${day.offered}` };
}

// How full each artist's week is: booked of offered slots per day, a week rate per artist and
// one for the whole salon. It loads its own week, so it has its own arrows, apart from the
// dashboard's period. On a phone each artist is a card with the week in a strip, five to a page.
export default function ArtistUtilization({ load }: { load: (date: string) => Promise<Utilization> }) {
  const today = manilaToday(new Date());
  const [anchor, setAnchor] = useState(today);
  const [data, setData] = useState<Utilization | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const asTable = useTableLayout();
  const from = mondayOf(anchor);
  const thisWeek = mondayOf(today);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const next = await load(anchor);
        if (live) {
          setData(next);
          setFailed(false);
        }
      } catch {
        if (live) setFailed(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [load, anchor, attempt]);

  const shown = data && data.week.from === from ? data : null;
  const cards = paginate(shown?.artists ?? [], page, CARDS_PER_PAGE);

  return (
    <section aria-label="Artist utilization" className="flex min-w-0 flex-col gap-4 rounded-2xl border border-crimson-light/40 bg-milk p-5 shadow-petal">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-normal text-gray-red">Artist utilization</h2>
          <p className="text-[13px] text-gray-red/80">
            {shown ? (shown.overall === null ? "No slots offered this week" : `${percent(shown.overall)} of all slots booked`) : " "}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {from !== thisWeek && (
            <Button type="button" variant="bare" onClick={() => setAnchor(today)} className="mr-1 rounded-full border border-crimson-light px-3 py-1 text-[12px] font-bold text-gray-red hover:bg-crimson-light/30">
              This week
            </Button>
          )}
          <Button type="button" variant="bare" aria-label="Previous week" onClick={() => setAnchor(addDays(from, -7))} className="rounded-full p-1.5 text-gray-red hover:bg-crimson-light/30">
            <ChevronLeft size={18} aria-hidden="true" />
          </Button>
          <span className="min-w-[9.5rem] text-center text-sm font-bold text-gray-red">{weekLabel(from, addDays(from, 6))}</span>
          <Button type="button" variant="bare" aria-label="Next week" onClick={() => setAnchor(addDays(from, 7))} className="rounded-full p-1.5 text-gray-red hover:bg-crimson-light/30">
            <ChevronRight size={18} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {failed ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-red">
          We couldn&apos;t load artist utilization.
          <Button type="button" variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </div>
      ) : !shown ? (
        <p className="text-sm text-gray-red/70">Loading…</p>
      ) : shown.artists.length === 0 ? (
        <p className="text-sm text-gray-red/70">No artists yet. Add them in Nail Artists, with their time slots.</p>
      ) : (
        <>
          {!asTable ? (
            <>
              <RowCards label="Artists">
                {cards.rows.map((artist) => (
                  <RowCard key={artist.id}>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={artist.name} imageUrl={artist.image ?? ""} size="md" decorative={!artist.image} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">{artist.name}</span>
                        {artist.title && <span className="block truncate text-[12px] text-gray-red/70">{artist.title}</span>}
                      </span>
                      <span className="shrink-0 font-bold text-berry">{artist.rate === null ? "–" : percent(artist.rate)}</span>
                    </div>
                    <ol aria-label={`${artist.name}'s week`} className="grid grid-cols-7 gap-1">
                      {artist.days.map((d, i) => {
                        const { label, text } = describe(d, DAY_NAMES[i]);
                        const fill = d.offered === 0 ? 0 : Math.min(d.booked / d.offered, 1);
                        return (
                          <li
                            key={d.date}
                            aria-label={label}
                            className={clsx("flex min-w-0 flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 text-center", d.date === today && "bg-crimson-light/40")}
                          >
                            <span aria-hidden="true" className="text-[11px] text-gray-red/70">{DAY_NAMES[i].slice(0, 2)}</span>
                            <span aria-hidden="true" className={clsx("text-[12px] leading-tight", d.off && d.booked === 0 ? "text-gray-red/50" : "font-bold")}>{text}</span>
                            {!d.off && d.offered > 0 && (
                              <span aria-hidden="true" className="block h-1 w-full overflow-hidden rounded-full bg-crimson-light/40">
                                <span className="block h-full rounded-full bg-berry" style={{ width: `${fill * 100}%` }} />
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </RowCard>
                ))}
              </RowCards>
              <Pagination page={cards.current} totalPages={cards.pages} onPageChange={setPage} summary={cards} />
            </>
          ) : (
          /* Wider than a phone: it scrolls sideways, with the artists' column kept in view */
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm text-gray-red">
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 z-10 w-56 bg-milk pb-2 text-left text-[12px] font-medium text-gray-red/70">
                    Artist
                  </th>
                  {shown.artists[0].days.map((d, i) => {
                    const isToday = d.date === today;
                    return (
                      <th
                        key={d.date}
                        scope="col"
                        className={clsx("rounded-t-lg px-1 pb-2 pt-1 text-center text-[12px] font-medium", isToday ? "bg-crimson-light/30 text-berry" : "text-gray-red/70")}
                      >
                        <span className="block">{DAY_NAMES[i].slice(0, 3)}</span>
                        <span className="block text-[11px]">{parts(d.date).day}</span>
                        {isToday && <span className="block text-[10px] font-bold">Today</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {shown.artists.map((artist) => (
                  <tr key={artist.id}>
                    <th scope="row" className="sticky left-0 z-10 border-t border-dotted border-crimson-light bg-milk py-3 pr-3 text-left font-normal">
                      <span className="flex items-center gap-2.5">
                        <Avatar name={artist.name} imageUrl={artist.image ?? ""} size="md" decorative={!artist.image} />
                        <span className="min-w-0">
                          <span className="block truncate font-bold">{artist.name}</span>
                          {artist.title && <span className="block truncate text-[12px] text-gray-red/70">{artist.title}</span>}
                          <span className="block text-[12px] font-bold text-berry">{artist.rate === null ? "–" : percent(artist.rate)}</span>
                        </span>
                      </span>
                    </th>
                    {artist.days.map((d, i) => {
                      const { label, text } = describe(d, DAY_NAMES[i]);
                      const fill = d.offered === 0 ? 0 : Math.min(d.booked / d.offered, 1);
                      return (
                        <td
                          key={d.date}
                          aria-label={label}
                          className={clsx("border-t border-dotted border-crimson-light px-1.5 py-3 text-center align-middle", d.date === today && "bg-crimson-light/30")}
                        >
                          <span className={clsx("block text-[13px]", d.off && d.booked === 0 ? "text-gray-red/50" : "font-bold")}>{text}</span>
                          {!d.off && d.offered > 0 && (
                            <span aria-hidden="true" className="mx-auto mt-1.5 block h-1.5 w-full max-w-14 overflow-hidden rounded-full bg-crimson-light/40">
                              <span className="block h-full rounded-full bg-berry" style={{ width: `${fill * 100}%` }} />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          <ul aria-label="Legend" className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-gray-red/80">
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-4 rounded-full bg-berry" />
              Booked
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-4 rounded-full bg-crimson-light/40" />
              Open
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden="true" className="text-gray-red/50">Off</span>
              Day off
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
