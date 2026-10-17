import "server-only";
import { getSql } from "./db";
import { SERVICE_PRICE_SQL } from "./appointments";
import { PROOF_TO_REVIEW_SQL } from "./proofRules";
import { PHOTOS_TO_ADD_SQL, TO_COMPLETE_SQL } from "./visitsToComplete";
import {
  LAPSED_DAYS, addDays, manilaClock, manilaToday, monthEnd, monthKeys, resolvePeriod,
  type DashboardRange, type Span,
} from "../lib/dashboardPeriods";
import { bucketTrend, trendBuckets, type DayValues, type TrendPoint } from "../lib/dashboardTrend";
import type { DashboardResponse } from "../services/dashboardTypes";
import { RESERVATION_FEE } from "../lib/visitCompletion";

// Every number on the dashboard, computed in SQL. Dates: appointment_date is already local text;
// created_at is UTC, so it is shifted to Manila's day (+8h) before it is compared.
const LOCAL_DATE = (column: string) => `to_char(${column}::timestamp + interval '8 hours', 'YYYY-MM-DD')`;

// A no-show counts with the cancellations: the visit didn't happen
const CANCELLED = "('CANCELLED','CANCELED','REFUNDED','NO_SHOW')";
const BOOKED = "('CONFIRMED','COMPLETED')";
const DECIDED = "('CONFIRMED','COMPLETED','CANCELLED','CANCELED','REFUNDED','NO_SHOW')";

// The appointments with a normalised status, a price, and who the client is. The shared
// walk-in guest (clients without an account) is flagged so client metrics can skip it.
const APPT = `
  with appt as (
    select a.id, a.user_id, a.appointment_date as d, a.appointment_time as t,
      upper(trim(a.status)) as st, ${LOCAL_DATE("a.created_at")} as created_d,
      -- For the Bookings and Returning clients cards: the day an admin completed the visit with the
      -- booking tracker's Complete visit (which only a confirmed booking has), from its record.
      -- Null otherwise, including visits marked completed before the tracker recorded them.
      case when upper(trim(a.status)) = 'COMPLETED' then ${LOCAL_DATE("vc.created_at")} end as tracked_d,
      a.service_name, coalesce(n.name, a.nailist_name) as nailist_name,
      ${SERVICE_PRICE_SQL} as price,
      coalesce(u.clerk_id = 'walkin_guest', false) as is_guest,
      trim(coalesce(a.walkin_first_name, cp.first_name, '') || ' ' || coalesce(a.walkin_last_name, cp.last_name, '')) as client_name,
      (select coalesce(sum(p.amount), 0) from payments p where p.appointment_id = a.id and upper(trim(p.status)) = 'PAID') as paid,
      vc.balance_amount as recorded_balance
    from appointments a
    left join nailists n on n.id = a.nailist_id
    left join nailist_categories nc on nc.id = n.category_id
    left join services s on s.id = a.service_id
    left join users u on u.id = a.user_id
    left join customer_profiles cp on cp.user_id = a.user_id
    left join visit_completions vc on vc.appointment_id = a.id
  )`;

// Values go in as positional parameters (the pooler runs without prepared statements)
async function rows<T>(text: string, params: string[]): Promise<T[]> {
  return (await getSql().unsafe(text, params)) as unknown as T[];
}
async function one<T>(text: string, params: string[]): Promise<T> {
  return (await rows<T>(text, params))[0];
}

// What a completed visit sold for: its downpayments and the balance recorded when it was
// completed; a visit completed before balances were recorded counts at its list price
const SALE = "(case when recorded_balance is not null then paid + recorded_balance else price end)";
// The balance paid at the salon: as recorded, else the list price less the downpayments (never below 0)
const BALANCE = "coalesce(recorded_balance, greatest(coalesce(price, 0) - paid, 0))";

const rate = (part: number, whole: number) => (whole === 0 ? null : part / whole);

// What a confirmed visit still has to pay at the salon: its list price less the downpayment paid,
// of which the reservation fee doesn't go toward the service (as Complete visit prefills it)
const STILL_TO_PAY = `greatest(coalesce(price, 0) - greatest(paid - ${RESERVATION_FEE}, 0), 0)`;

// Booked ahead's points, from today to the end of the period: a day each, or a month each for the
// year (so its line doesn't have hundreds of points)
function aheadBuckets(range: DashboardRange, today: string, to: string): Span[] {
  const buckets: Span[] = [];
  for (let from = today; from <= to; ) {
    const end = range === "year" ? monthEnd(from) : from;
    buckets.push({ from, to: end < to ? end : to });
    from = addDays(end, 1);
  }
  return buckets;
}

// A client who has booked: at least one confirmed or completed appointment
const HAS_BOOKED = `exists (select 1 from appointments b where b.user_id = u.id and upper(trim(b.status)) in ${BOOKED})`;
const CLIENT_ACCOUNT = `coalesce(u.role, 'customer') = 'customer' and u.clerk_id <> 'walkin_guest'`;

// Warm leads: client accounts that haven't booked, whose last sign of interest (making the account
// or starting a booking) is on or after $1. Used for the count and for the Client Directory's list.
// Appointments are read once, grouped by client, rather than twice per user in correlated subqueries.
export const WARM_LEADS = `
  select u.clerk_id from users u
  left join (
    select user_id, bool_or(upper(trim(status)) in ${BOOKED}) as booked,
      max(created_at::timestamp) as last_started
    from appointments group by user_id
  ) a on a.user_id = u.id
  where ${CLIENT_ACCOUNT} and not coalesce(a.booked, false)
    and ${LOCAL_DATE("greatest(u.created_at::timestamp, a.last_started)")} >= $1`;
export const warmSince = (today: string) => addDays(today, -LAPSED_DAYS);

// Each client's first visit completed with the tracker (by the day it was completed, as the money
// is dated), for "returning revenue" (a completed visit before the period). Read from the tables
// directly so the APPT query it's joined to is used once, and stays filtered by date instead of
// being built in full for every row it's compared with.
const FIRST_VISIT = `first_visit as (
    select a.user_id, min(${LOCAL_DATE("vc.created_at")}) as first_d
    from appointments a join visit_completions vc on vc.appointment_id = a.id
    where upper(trim(a.status)) = 'COMPLETED' group by a.user_id
  )`;

// The glance cards' lines, one point per trend bucket: client accounts at the bucket's end (today's
// count less the accounts made after it), and the different services and artists booked in it
function glanceTrend(points: TrendPoint[], buckets: Span[], dayMix: { d: string; services: string[]; artists: string[] }[], clientsNow: number) {
  let madeLater = 0;
  const clientsAtEnd = points.map(() => 0);
  for (let i = points.length - 1; i >= 0; i--) {
    clientsAtEnd[i] = clientsNow - madeLater;
    madeLater += points[i].newClients;
  }
  return buckets.map((bucket, i) => {
    const days = dayMix.filter((r) => r.d >= bucket.from && r.d <= bucket.to);
    return {
      date: bucket.from,
      clients: clientsAtEnd[i],
      services: new Set(days.flatMap((r) => r.services)).size,
      artists: new Set(days.flatMap((r) => r.artists)).size,
    };
  });
}

export async function listWarmLeads(now: Date = new Date()): Promise<string[]> {
  const found = await rows<{ clerk_id: string }>(`${WARM_LEADS} order by u.clerk_id`, [warmSince(manilaToday(now))]);
  return found.map((r) => r.clerk_id);
}

// What is measured for one span (the period, then the one before it)
async function spanMetrics(span: Span) {
  const p = [span.from, span.to];
  const [counts, booked, newClients, conversion, returning, leads, returningRevenue] = await Promise.all([
    // The money (Collected, Sales, Balance at the salon): the visits an admin completed with the
    // booking tracker in the period, dated by that day (tracked_d), so never a refunded one, and
    // always with the balance recorded. Cancellations and the outcome counts stay by the visit's day.
    one<{ estimated_sales: number; collected: number; balance_at_salon: number; sold: number; lost: number; completed: number; cancelled: number; decided: number }>(
      `${APPT} select
         coalesce(sum(${SALE}) filter (where tracked_d between $1 and $2), 0)::int as estimated_sales,
         coalesce(sum(paid) filter (where tracked_d between $1 and $2), 0)::int as collected,
         coalesce(sum(${BALANCE}) filter (where tracked_d between $1 and $2), 0)::int as balance_at_salon,
         count(*) filter (where tracked_d between $1 and $2)::int as sold,
         coalesce(sum(price) filter (where st in ${CANCELLED} and d between $1 and $2), 0)::int as lost,
         count(*) filter (where st = 'COMPLETED' and d between $1 and $2)::int as completed,
         count(*) filter (where st in ${CANCELLED} and d between $1 and $2)::int as cancelled,
         count(*) filter (where st in ${DECIDED} and d between $1 and $2)::int as decided
       from appt where d between $1 and $2 or tracked_d between $1 and $2`, p),
    // Bookings: confirmed and completed (the tracker's last step) in the period, dated by the completion
    one<{ n: number }>(`${APPT} select count(*)::int as n from appt where tracked_d between $1 and $2`, p),
    one<{ n: number }>(
      `select count(*)::int as n from users
       where coalesce(role, 'customer') = 'customer' and clerk_id <> 'walkin_guest'
         and ${LOCAL_DATE("created_at")} between $1 and $2`, p),
    one<{ created: number; converted: number }>(
      `${APPT} select count(*)::int as created, count(*) filter (where st in ${BOOKED})::int as converted
       from appt where not is_guest and created_d between $1 and $2`, p),
    one<{ clients: number; returning: number }>(
      `${APPT} select count(*)::int as clients, count(*) filter (where prior)::int as returning
       from (select user_id, bool_or(d < $1) as prior, bool_or(d between $1 and $2) as inside
             from appt where st = 'COMPLETED' and not is_guest group by user_id) t
       where inside`, p),
    one<{ leads: number; booked: number }>(
      `select count(*)::int as leads, count(*) filter (where ${HAS_BOOKED})::int as booked
       from users u where ${CLIENT_ACCOUNT} and ${LOCAL_DATE("u.created_at")} between $1 and $2`, p),
    // the same "returning" as the rate: a client with a completed visit before the period
    one<{ value: number }>(
      `${APPT}, ${FIRST_VISIT} select coalesce(sum(${SALE}), 0)::int as value
       from appt v join first_visit f on f.user_id = v.user_id and f.first_d < $1
       where not v.is_guest and v.tracked_d between $1 and $2`, p),
  ]);
  return {
    bookings: booked.n,
    estimatedSales: counts.estimated_sales,
    balanceAtSalon: counts.balance_at_salon,
    lost: counts.lost,
    completed: counts.completed,
    cancelled: counts.cancelled,
    decided: counts.decided,
    collected: counts.collected,
    newClients: newClients.n,
    cancellation: rate(counts.cancelled, counts.decided),
    conversion: rate(conversion.converted, conversion.created),
    returning: rate(returning.returning, returning.clients),
    averageSale: counts.sold === 0 ? null : Math.round(counts.estimated_sales / counts.sold),
    leadConversion: rate(leads.booked, leads.leads),
    leadAccounts: leads.leads,
    leadBooked: leads.booked,
    returningRevenue: returningRevenue.value,
  };
}

export async function buildDashboard(range: DashboardRange, now: Date = new Date()): Promise<DashboardResponse> {
  const today = manilaToday(now);
  const { period, previous } = resolvePeriod(range, today);
  const p = [period.from, period.to];
  const months = monthKeys(today, 6);
  const { granularity, buckets } = trendBuckets(range, period, today);
  // The trend line runs from the period's first day to today, so only those days are read
  const trendSpan = buckets.length === 0 ? null : [buckets[0].from, buckets[buckets.length - 1].to];
  // Booked ahead looks from today to the end of the period (just today for one that ends today).
  // It's compared with the same stretch of the previous period: as many days into it, to its end.
  const aheadTo = period.to > today ? period.to : today;
  const ahead = [today, aheadTo];
  const daysIn = Math.round((Date.parse(today) - Date.parse(period.from)) / 86_400_000);
  const shifted = addDays(previous.from, daysIn);
  const aheadBefore = [shifted < previous.to ? shifted : previous.to, previous.to];

  // Both counts match the lists they link to on the Appointments screen: "Pending" is the PENDING
  // filter, "Proofs to review" is the PROOF_PENDING filter (an awaiting-proof booking whose latest
  // upload is still pending).
  const [current, before, loyalty, attention, lapsed, monthlyRows, serviceRows, weekdayRows, artistRows, outcomeRows, next, dayAppts, dayLost, recurringSince, dayBooked, dayClients, aheadTotal, aheadPrevious, warm, base, counts, sales, aheadDays, dayMix] =
    await Promise.all([
      spanMetrics(period),
      spanMetrics(previous),
      one<{ stamps: number; redeemed: number }>(
        `select count(*) filter (where action = 'stamp')::int as stamps,
                count(*) filter (where action = 'redeem')::int as redeemed
         from scan_history where ${LOCAL_DATE("created_at")} between $1 and $2`, p),
      // One pass over the appointments (#25), with the screenshot and visit-to-complete rules
      one<{ today: number; unpaid: number; proofs_to_review: number; to_confirm: number; to_complete: number; photos_to_add: number }>(
        `select
           count(*) filter (where a.appointment_date = $1 and upper(trim(a.status)) = 'CONFIRMED')::int as today,
           count(*) filter (where upper(trim(a.status)) = 'PENDING')::int as unpaid,
           count(*) filter (where upper(trim(a.status)) = 'AWAITING_CONFIRMATION')::int as to_confirm,
           count(*) filter (where ${PROOF_TO_REVIEW_SQL("a")})::int as proofs_to_review,
           count(*) filter (where ${TO_COMPLETE_SQL("a", today, manilaClock(now))})::int as to_complete,
           count(*) filter (where ${PHOTOS_TO_ADD_SQL("a")})::int as photos_to_add
         from appointments a`, [today]),
      one<{ n: number }>(
        `${APPT} select count(*)::int as n
         from (select user_id, max(d) as last_d from appt where st = 'COMPLETED' and not is_guest group by user_id) t
         where last_d < $1`, [addDays(today, -LAPSED_DAYS)]),
      rows<{ month: string; completed: number; cancelled: number }>(
        `${APPT} select substr(d, 1, 7) as month,
           count(*) filter (where st = 'COMPLETED')::int as completed,
           count(*) filter (where st in ${CANCELLED})::int as cancelled
         from appt where d >= $1 and d <= $2 group by 1`, [`${months[0]}-01`, `${months[months.length - 1]}-31`]),
      rows<{ name: string; bookings: number; estimated_sales: number }>(
        `${APPT} select service_name as name, count(*)::int as bookings,
           coalesce(sum(${SALE}) filter (where st = 'COMPLETED'), 0)::int as estimated_sales
         from appt where d between $1 and $2 and st in ${BOOKED}
         group by service_name order by bookings desc, estimated_sales desc, service_name`, p),
      rows<{ weekday: number; bookings: number }>(
        `${APPT} select extract(isodow from d::date)::int as weekday, count(*)::int as bookings
         from appt where d between $1 and $2 and st in ${BOOKED} group by 1`, p),
      rows<{ name: string; bookings: number }>(
        `${APPT} select nailist_name as name, count(*)::int as bookings
         from appt where d between $1 and $2 and st in ${BOOKED}
         group by nailist_name order by bookings desc, nailist_name`, p),
      rows<{ st: string; n: number }>(
        `${APPT} select st, count(*)::int as n from appt where d between $1 and $2 group by st`, p),
      rows<DashboardResponse["next"][number]>(
        `${APPT} select id, client_name, service_name, nailist_name, d as appointment_date, t as appointment_time
         from appt
         where st = 'CONFIRMED' and (d > $1 or (d = $1 and lpad(split_part(t, '-', 1), 5, '0') >= $2))
         order by d, lpad(split_part(t, '-', 1), 5, '0'), id limit 5`, [today, manilaClock(now)]),
      // The same day by day, for the lines: also the money cards' values, worked out as on the
      // cards ("returning" means a completed visit before the period's first day, $1)
      trendSpan
        ? rows<{ d: string; sales: number; collected: number; balance: number; returning: number }>(
            `${APPT}, ${FIRST_VISIT} select tracked_d as d,
               coalesce(sum(${SALE}), 0)::int as sales,
               coalesce(sum(paid), 0)::int as collected,
               coalesce(sum(${BALANCE}), 0)::int as balance,
               coalesce(sum(${SALE}) filter (where not is_guest and f.first_d < $1), 0)::int as returning
             from appt v left join first_visit f on f.user_id = v.user_id
             where tracked_d between $1 and $2 group by tracked_d`, trendSpan)
        : Promise.resolve([]),
      // What cancellations cost, by the visit's day like its card
      trendSpan
        ? rows<{ d: string; n: number }>(
            `${APPT} select d, coalesce(sum(price), 0)::int as n from appt
             where st in ${CANCELLED} and d between $1 and $2 group by d`, trendSpan)
        : Promise.resolve([]),
      // Returning clients: the day each client's second confirmed and completed visit was completed
      // (as the Bookings card dates them), the day they became one; the walk-in guest isn't a client
      rows<{ d: string; n: number }>(
        `${APPT} select second_d as d, count(*)::int as n from (
           select user_id, (array_agg(tracked_d order by tracked_d))[2] as second_d
           from appt where tracked_d is not null and not is_guest group by user_id
         ) t where second_d is not null group by 1`, []),
      // The Bookings card's line, by the tracker's day like the card
      trendSpan
        ? rows<{ d: string; n: number }>(
            `${APPT} select tracked_d as d, count(*)::int as n from appt where tracked_d between $1 and $2 group by 1`, trendSpan)
        : Promise.resolve([]),
      trendSpan
        ? rows<{ d: string; n: number }>(
            `select ${LOCAL_DATE("created_at")} as d, count(*)::int as n from users
             where coalesce(role, 'customer') = 'customer' and clerk_id <> 'walkin_guest'
               and ${LOCAL_DATE("created_at")} between $1 and $2 group by 1`, trendSpan)
        : Promise.resolve([]),
      // Booked ahead: confirmed visits from today to the period's end, and what they still have to pay
      one<{ value: number; visits: number }>(
        `${APPT} select coalesce(sum(${STILL_TO_PAY}), 0)::int as value, count(*)::int as visits
         from appt where st = 'CONFIRMED' and d between $1 and $2`, ahead),
      // The same for that stretch of the previous period: its visits are past, so those confirmed
      // or completed (by status), at what they had to pay at the salon the same way
      one<{ value: number }>(
        `${APPT} select coalesce(sum(${STILL_TO_PAY}), 0)::int as value
         from appt where st in ${BOOKED} and d between $1 and $2`, aheadBefore),
      one<{ n: number }>(`select count(*)::int as n from (${WARM_LEADS}) w`, [warmSince(today)]),
      // the same clients as Lapsed clients: anyone but the walk-in guest with a completed visit
      one<{ clients: number; spent: number }>(
        `${APPT} select count(distinct user_id)::int as clients, coalesce(sum(${SALE}), 0)::int as spent
         from appt where st = 'COMPLETED' and not is_guest`, []),
      one<{ clients: number; services: number; artists: number }>(
        `select (select count(*)::int from users u where ${CLIENT_ACCOUNT}) as clients,
           (select count(*)::int from services where is_active = 1) as services,
           (select count(*)::int from nailists) as artists`, []),
      rows<DashboardResponse["sales"][number]>(
        `${APPT} select id, d as date, t as time, coalesce(nullif(client_name, ''), 'Client') as client_name,
           case when is_guest then null else user_id end as user_id, service_name, nailist_name, ${SALE}::int as fee
         from appt where tracked_d between $1 and $2
         order by tracked_d desc, d desc, lpad(split_part(t, '-', 1), 5, '0') desc, id desc`, p),
      // The same day by day, for its line
      rows<{ d: string; value: number; visits: number }>(
        `${APPT} select d, coalesce(sum(${STILL_TO_PAY}), 0)::int as value, count(*)::int as visits from appt
         where st = 'CONFIRMED' and d between $1 and $2 group by d`, ahead),
      // Which services and artists were booked each day, for the glance cards' lines (merged per
      // week or month below, so a service booked on two days of a week counts once)
      trendSpan
        ? rows<{ d: string; services: string[]; artists: string[] }>(
            `${APPT} select d, to_json(array_agg(distinct service_name)) as services, to_json(array_agg(distinct nailist_name)) as artists
             from appt where d between $1 and $2 and st in ${BOOKED} group by d`, trendSpan)
        : Promise.resolve([]),
    ]);

  const byDay: Record<string, Partial<DayValues>> = {};
  const day = (d: string) => (byDay[d] ??= {});
  for (const r of dayAppts as { d: string; sales: number; collected: number; balance: number; returning: number }[]) {
    Object.assign(day(r.d), { estimatedSales: r.sales, collected: r.collected, balanceAtSalon: r.balance, returningRevenue: r.returning });
  }
  for (const r of dayLost as { d: string; n: number }[]) day(r.d).lost = r.n;
  for (const r of dayBooked as { d: string; n: number }[]) day(r.d).bookings = r.n;
  for (const r of dayClients as { d: string; n: number }[]) day(r.d).newClients = r.n;

  // Five rows at most, Other included: with more than five services, the top four and Other
  const shown = serviceRows.length > 5 ? 4 : 5;
  const topServices = serviceRows.slice(0, shown).map((r) => ({ name: r.name, bookings: r.bookings, estimatedSales: r.estimated_sales }));
  const otherServices = serviceRows.slice(shown);
  if (otherServices.length > 0) {
    topServices.push({
      name: "Other",
      bookings: otherServices.reduce((sum, r) => sum + r.bookings, 0),
      estimatedSales: otherServices.reduce((sum, r) => sum + r.estimated_sales, 0),
    });
  }

  // Returning clients as of a day: those whose second completed visit came on or before it. The
  // card counts them as of the period's end (today at the latest), and its line as of each point's end.
  const recurringBy = (day: string) => (recurringSince as { d: string; n: number }[]).reduce((sum, r) => (r.d <= day ? sum + r.n : sum), 0);
  const asOf = (span: Span) => recurringBy(span.to < today ? span.to : today);
  const trend = bucketTrend(granularity, buckets, byDay);
  trend.points.forEach((point, i) => (point.recurringClients = recurringBy(buckets[i].to)));
  const outcome = (...statuses: string[]) => outcomeRows.filter((r) => statuses.includes(r.st)).reduce((sum, r) => sum + r.n, 0);

  return {
    range,
    period,
    previous,
    kpis: {
      collected: { value: current.collected, previous: before.collected },
      estimatedSales: { value: current.estimatedSales, previous: before.estimatedSales },
      bookings: { value: current.bookings, previous: before.bookings },
      newClients: { value: current.newClients, previous: before.newClients },
      recurringClients: { value: asOf(period), previous: asOf(previous) },
    },
    rates: {
      cancellation: { value: current.cancellation, previous: before.cancellation },
      conversion: { value: current.conversion, previous: before.conversion },
      returning: { value: current.returning, previous: before.returning },
      averageSale: { value: current.averageSale, previous: before.averageSale },
      leadConversion: { value: current.leadConversion, previous: before.leadConversion },
    },
    lapsedClients: lapsed.n,
    leads: { accounts: current.leadAccounts, booked: current.leadBooked },
    sales,
    totals: {
      clients: counts.clients,
      services: counts.services,
      artists: counts.artists,
      upcoming: aheadTotal.visits,
      trend: glanceTrend(trend.points, buckets, dayMix as { d: string; services: string[]; artists: string[] }[], counts.clients),
    },
    clientBase: {
      clients: base.clients,
      lifetimeValue: base.clients === 0 ? null : Math.round(base.spent / base.clients),
      churn: rate(lapsed.n, base.clients),
    },
    trend,
    loyalty,
    attention: { today: attention.today, proofsToReview: attention.proofs_to_review, toConfirm: attention.to_confirm, toComplete: attention.to_complete, photosToAdd: attention.photos_to_add, unpaid: attention.unpaid, warmLeads: warm.n },
    money: {
      balanceAtSalon: { value: current.balanceAtSalon, previous: before.balanceAtSalon },
      returningRevenue: { value: current.returningRevenue, previous: before.returningRevenue },
      lostToCancellations: { value: current.lost, previous: before.lost },
      bookedAhead: {
        ...aheadTotal,
        previous: aheadPrevious.value,
        granularity: range === "year" ? "month" : "day",
        days: aheadBuckets(range, today, aheadTo).map((bucket) => {
          const inside = aheadDays.filter((r) => r.d >= bucket.from && r.d <= bucket.to);
          return { date: bucket.from, value: inside.reduce((sum, r) => sum + r.value, 0), visits: inside.reduce((sum, r) => sum + r.visits, 0) };
        }),
      },
    },
    monthly: months.map((month) => {
      const found = monthlyRows.find((r) => r.month === month);
      return { month, completed: found?.completed ?? 0, cancelled: found?.cancelled ?? 0 };
    }),
    services: topServices,
    weekdays: Array.from({ length: 7 }, (_, i) => ({
      weekday: i + 1,
      bookings: weekdayRows.find((r) => r.weekday === i + 1)?.bookings ?? 0,
    })),
    artists: artistRows,
    outcomes: {
      confirmed: outcome("CONFIRMED"),
      completed: outcome("COMPLETED"),
      pending: outcome("PENDING", "AWAITING_PROOF", "AWAITING_CONFIRMATION"),
      cancelled: outcome("CANCELLED", "CANCELED"),
      refunded: outcome("REFUNDED"),
    },
    next,
  };
}
