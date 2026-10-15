import "server-only";
import { getSql } from "./db";
import { SERVICE_PRICE_SQL } from "./appointments";
import {
  LAPSED_DAYS, addDays, manilaClock, manilaToday, monthKeys, resolvePeriod,
  type DashboardRange, type Span,
} from "../features/dashboard/lib/dashboardPeriods";
import { bucketTrend, trendBuckets, type DayValues, type TrendPoint } from "../features/dashboard/lib/dashboardTrend";
import type { DashboardResponse } from "../features/dashboard/types";

// Every number on the dashboard, computed in SQL. Dates: appointment_date is already local text;
// created_at is UTC, so it is shifted to Manila's day (+8h) before it is compared.
const LOCAL_DATE = (column: string) => `to_char(${column}::timestamp + interval '8 hours', 'YYYY-MM-DD')`;

const CANCELLED = "('CANCELLED','CANCELED','REFUNDED')";
const BOOKED = "('CONFIRMED','COMPLETED')";
const DECIDED = "('CONFIRMED','COMPLETED','CANCELLED','CANCELED','REFUNDED')";

// The appointments with a normalised status, a price, and who the client is. The shared
// walk-in guest (clients without an account) is flagged so client metrics can skip it.
const APPT = `
  with appt as (
    select a.id, a.user_id, a.appointment_date as d, a.appointment_time as t,
      upper(trim(a.status)) as st, ${LOCAL_DATE("a.created_at")} as created_d,
      a.service_name, coalesce(n.name, a.nailist_name) as nailist_name,
      ${SERVICE_PRICE_SQL} as price,
      coalesce(u.clerk_id = 'walkin_guest', false) as is_guest,
      trim(coalesce(a.walkin_first_name, cp.first_name, '') || ' ' || coalesce(a.walkin_last_name, cp.last_name, '')) as client_name
    from appointments a
    left join nailists n on n.id = a.nailist_id
    left join nailist_categories nc on nc.id = n.category_id
    left join services s on s.id = a.service_id
    left join users u on u.id = a.user_id
    left join customer_profiles cp on cp.user_id = a.user_id
  )`;

// Values go in as positional parameters (the pooler runs without prepared statements)
async function rows<T>(text: string, params: string[]): Promise<T[]> {
  return (await getSql().unsafe(text, params)) as unknown as T[];
}
async function one<T>(text: string, params: string[]): Promise<T> {
  return (await rows<T>(text, params))[0];
}

const rate = (part: number, whole: number) => (whole === 0 ? null : part / whole);

// How far ahead Booked ahead's line looks
const AHEAD_DAYS = 14;

// A client who has booked: at least one confirmed or completed appointment
const HAS_BOOKED = `exists (select 1 from appointments b where b.user_id = u.id and upper(trim(b.status)) in ${BOOKED})`;
const CLIENT_ACCOUNT = `coalesce(u.role, 'customer') = 'customer' and u.clerk_id <> 'walkin_guest'`;

// Warm leads: client accounts that haven't booked, whose last sign of interest (making the account
// or starting a booking) is on or after $1. Used for the count and for the Client Directory's list.
const WARM_LEADS = `
  select u.clerk_id from users u
  where ${CLIENT_ACCOUNT} and not ${HAS_BOOKED}
    and greatest(${LOCAL_DATE("u.created_at")},
      coalesce((select max(${LOCAL_DATE("s.created_at")}) from appointments s where s.user_id = u.id), '')) >= $1`;
const warmSince = (today: string) => addDays(today, -LAPSED_DAYS);

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
  const [counts, collected, newClients, conversion, returning, leads, returningRevenue] = await Promise.all([
    one<{ bookings: number; estimated_sales: number; balance_at_salon: number; lost: number; completed: number; cancelled: number; decided: number }>(
      `${APPT} select
         count(*) filter (where st in ${BOOKED})::int as bookings,
         coalesce(sum(price) filter (where st = 'COMPLETED'), 0)::int as estimated_sales,
         coalesce(sum(greatest(coalesce(price, 0) - (select coalesce(sum(p.amount), 0) from payments p
           where p.appointment_id = appt.id and upper(trim(p.status)) = 'PAID'), 0)) filter (where st = 'COMPLETED'), 0)::int as balance_at_salon,
         coalesce(sum(price) filter (where st in ${CANCELLED}), 0)::int as lost,
         count(*) filter (where st = 'COMPLETED')::int as completed,
         count(*) filter (where st in ${CANCELLED})::int as cancelled,
         count(*) filter (where st in ${DECIDED})::int as decided
       from appt where d between $1 and $2`, p),
    one<{ collected: number }>(
      `select coalesce(sum(amount), 0)::int as collected from payments
       where upper(trim(status)) = 'PAID' and ${LOCAL_DATE("created_at")} between $1 and $2`, p),
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
      `${APPT} select coalesce(sum(price), 0)::int as value from appt v
       where v.st = 'COMPLETED' and not v.is_guest and v.d between $1 and $2
         and exists (select 1 from appt b where b.user_id = v.user_id and b.st = 'COMPLETED' and b.d < $1)`, p),
  ]);
  return {
    bookings: counts.bookings,
    estimatedSales: counts.estimated_sales,
    balanceAtSalon: counts.balance_at_salon,
    lost: counts.lost,
    completed: counts.completed,
    cancelled: counts.cancelled,
    decided: counts.decided,
    collected: collected.collected,
    newClients: newClients.n,
    cancellation: rate(counts.cancelled, counts.decided),
    conversion: rate(conversion.converted, conversion.created),
    returning: rate(returning.returning, returning.clients),
    averageSale: counts.completed === 0 ? null : Math.round(counts.estimated_sales / counts.completed),
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

  // Both counts match the lists they link to on the Appointments screen: "Pending" is the PENDING
  // filter, "Proofs to review" is the PROOF_PENDING filter (an awaiting-proof booking whose latest
  // upload is still pending).
  const [current, before, loyalty, attention, lapsed, monthlyRows, serviceRows, weekdayRows, artistRows, outcomeRows, next, dayAppts, dayPayments, dayClients, ahead, warm, base, counts, sales, aheadDays, dayMix] =
    await Promise.all([
      spanMetrics(period),
      spanMetrics(previous),
      one<{ stamps: number; redeemed: number }>(
        `select count(*) filter (where action = 'stamp')::int as stamps,
                count(*) filter (where action = 'redeem')::int as redeemed
         from scan_history where ${LOCAL_DATE("created_at")} between $1 and $2`, p),
      one<{ today: number; unpaid: number; proofs_to_review: number }>(
        `${APPT} select
           (select count(*)::int from appt where d = $1 and st = 'CONFIRMED') as today,
           (select count(*)::int from appt where st = 'PENDING') as unpaid,
           (select count(*)::int from appt a where a.st = 'AWAITING_PROOF'
              and (select pp.status from payment_proofs pp where pp.appointment_id = a.id
                   order by pp.created_at desc, pp.id desc limit 1) = 'PENDING') as proofs_to_review`, [today]),
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
           coalesce(sum(price) filter (where st = 'COMPLETED'), 0)::int as estimated_sales
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
        ? rows<{ d: string; bookings: number; sales: number; balance: number; returning: number; lost: number }>(
            `${APPT} select d, count(*) filter (where st in ${BOOKED})::int as bookings,
               coalesce(sum(price) filter (where st = 'COMPLETED'), 0)::int as sales,
               coalesce(sum(greatest(coalesce(price, 0) - (select coalesce(sum(p.amount), 0) from payments p
                 where p.appointment_id = v.id and upper(trim(p.status)) = 'PAID'), 0)) filter (where st = 'COMPLETED'), 0)::int as balance,
               coalesce(sum(price) filter (where st = 'COMPLETED' and not is_guest
                 and exists (select 1 from appt b where b.user_id = v.user_id and b.st = 'COMPLETED' and b.d < $1)), 0)::int as returning,
               coalesce(sum(price) filter (where st in ${CANCELLED}), 0)::int as lost
             from appt v where d between $1 and $2 group by d`, trendSpan)
        : Promise.resolve([]),
      trendSpan
        ? rows<{ d: string; collected: number }>(
            `select ${LOCAL_DATE("created_at")} as d, coalesce(sum(amount), 0)::int as collected from payments
             where upper(trim(status)) = 'PAID' and ${LOCAL_DATE("created_at")} between $1 and $2 group by 1`, trendSpan)
        : Promise.resolve([]),
      trendSpan
        ? rows<{ d: string; n: number }>(
            `select ${LOCAL_DATE("created_at")} as d, count(*)::int as n from users
             where coalesce(role, 'customer') = 'customer' and clerk_id <> 'walkin_guest'
               and ${LOCAL_DATE("created_at")} between $1 and $2 group by 1`, trendSpan)
        : Promise.resolve([]),
      one<{ value: number; visits: number }>(
        `${APPT} select coalesce(sum(price), 0)::int as value, count(*)::int as visits
         from appt where st = 'CONFIRMED' and d >= $1`, [today]),
      one<{ n: number }>(`select count(*)::int as n from (${WARM_LEADS}) w`, [warmSince(today)]),
      // the same clients as Lapsed clients: anyone but the walk-in guest with a completed visit
      one<{ clients: number; spent: number }>(
        `${APPT} select count(distinct user_id)::int as clients, coalesce(sum(price), 0)::int as spent
         from appt where st = 'COMPLETED' and not is_guest`, []),
      one<{ clients: number; services: number; artists: number }>(
        `select (select count(*)::int from users u where ${CLIENT_ACCOUNT}) as clients,
           (select count(*)::int from services where is_active = 1) as services,
           (select count(*)::int from nailists) as artists`, []),
      rows<DashboardResponse["sales"][number]>(
        `${APPT} select id, d as date, t as time, coalesce(nullif(client_name, ''), 'Client') as client_name,
           case when is_guest then null else user_id end as user_id, service_name, nailist_name, price as fee
         from appt where st = 'COMPLETED' and d between $1 and $2
         order by d desc, lpad(split_part(t, '-', 1), 5, '0') desc, id desc`, p),
      // Booked ahead, day by day for the next 14 days, for its line
      rows<{ d: string; value: number; visits: number }>(
        `${APPT} select d, coalesce(sum(price), 0)::int as value, count(*)::int as visits from appt
         where st = 'CONFIRMED' and d between $1 and $2 group by d`, [today, addDays(today, AHEAD_DAYS - 1)]),
      // Which services and artists were booked each day, for the glance cards' lines (merged per
      // week or month below, so a service booked on two days of a week counts once)
      trendSpan
        ? rows<{ d: string; services: string[]; artists: string[] }>(
            `${APPT} select d, array_agg(distinct service_name) as services, array_agg(distinct nailist_name) as artists
             from appt where d between $1 and $2 and st in ${BOOKED} group by d`, trendSpan)
        : Promise.resolve([]),
    ]);

  const byDay: Record<string, Partial<DayValues>> = {};
  const day = (d: string) => (byDay[d] ??= {});
  for (const r of dayAppts as { d: string; bookings: number; sales: number; balance: number; returning: number; lost: number }[]) {
    Object.assign(day(r.d), { bookings: r.bookings, estimatedSales: r.sales, balanceAtSalon: r.balance, returningRevenue: r.returning, lost: r.lost });
  }
  for (const r of dayPayments as { d: string; collected: number }[]) day(r.d).collected = r.collected;
  for (const r of dayClients as { d: string; n: number }[]) day(r.d).newClients = r.n;

  const topServices = serviceRows.slice(0, 5).map((r) => ({ name: r.name, bookings: r.bookings, estimatedSales: r.estimated_sales }));
  const otherServices = serviceRows.slice(5);
  if (otherServices.length > 0) {
    topServices.push({
      name: "Other",
      bookings: otherServices.reduce((sum, r) => sum + r.bookings, 0),
      estimatedSales: otherServices.reduce((sum, r) => sum + r.estimated_sales, 0),
    });
  }

  const trend = bucketTrend(granularity, buckets, byDay);
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
      upcoming: ahead.visits,
      trend: glanceTrend(trend.points, buckets, dayMix as { d: string; services: string[]; artists: string[] }[], counts.clients),
    },
    clientBase: {
      clients: base.clients,
      lifetimeValue: base.clients === 0 ? null : Math.round(base.spent / base.clients),
      churn: rate(lapsed.n, base.clients),
    },
    trend,
    loyalty,
    attention: { today: attention.today, proofsToReview: attention.proofs_to_review, unpaid: attention.unpaid, warmLeads: warm.n },
    money: {
      balanceAtSalon: { value: current.balanceAtSalon, previous: before.balanceAtSalon },
      returningRevenue: { value: current.returningRevenue, previous: before.returningRevenue },
      lostToCancellations: { value: current.lost, previous: before.lost },
      bookedAhead: {
        ...ahead,
        days: Array.from({ length: AHEAD_DAYS }, (_, i) => {
          const date = addDays(today, i);
          const found = aheadDays.find((r) => r.d === date);
          return { date, value: found?.value ?? 0, visits: found?.visits ?? 0 };
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
      pending: outcome("PENDING", "AWAITING_PROOF"),
      cancelled: outcome("CANCELLED", "CANCELED"),
      refunded: outcome("REFUNDED"),
    },
    next,
  };
}
