import "server-only";
import { getSql } from "./db";
import { SERVICE_PRICE_SQL } from "./appointments";
import { PROOF_TO_REVIEW_SQL } from "./proofRules";
import { PHOTOS_TO_ADD_SQL, TO_COMPLETE_SQL } from "./visitsToComplete";
import {
  LAPSED_DAYS, addDays, manilaClock, manilaToday, resolvePeriod,
  type DashboardRange, type Span,
} from "../lib/dashboardPeriods";
import { barGranularity, bucketTrend, trendBuckets, type DayValues } from "../lib/dashboardTrend";
import type { DashboardResponse } from "../services/dashboardTypes";

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
      vc.balance_amount as recorded_balance, coalesce(vc.late_fee, 0) as late_fee,
      -- When it was cancelled (or a no-show) or refunded; before those were recorded, the visit's day,
      -- or today for a visit still to come (it was cancelled by now, just not dated)
      coalesce(${LOCAL_DATE("a.cancelled_at")}, least(a.appointment_date, ${LOCAL_DATE("clawholics_utc_now()")})) as cancel_d,
      coalesce(${LOCAL_DATE("a.refunded_at")}, least(a.appointment_date, ${LOCAL_DATE("clawholics_utc_now()")})) as refund_d, a.cancelled_at
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

// From 18 October 2026 (the visit's day) the Bookings per month chart, the Service mix, the Salon
// notes' busiest weekday and artist, and the Sales page's Top services and How bookings ended count
// a visit only once it was completed with the booking tracker (confirmed, then Complete visit);
// visits before it still count by their status, as they did before the tracker
const TRACKER_FROM = "2026-10-18";
// A completed visit's day for the chart: before TRACKER_FROM the visit's day if its status is
// Completed, from it the day it was completed with the tracker
const DONE_D = `(case when d < '${TRACKER_FROM}' then (case when st = 'COMPLETED' then d end) else tracked_d end)`;
// Booked for the Service mix, Top services and the Salon notes' weekdays and artists: confirmed or
// completed before TRACKER_FROM, completed with the tracker from it
const MIX_BOOKED = `((d < '${TRACKER_FROM}' and st in ${BOOKED}) or (d >= '${TRACKER_FROM}' and tracked_d is not null))`;

// Every paid downpayment, grouped: the day it came in (in_d), and the day it stopped being held
// for a visit to come (out_d) and how: earned (the visit was completed: with the tracker, by that
// day, or before the tracker by the visit's day), refunded, or forfeited (kept from a cancellation
// or a no-show). Still held: no out_d. A payment that arrived after its booking was cancelled
// (the admins are told to check it) wasn't kept from a cancellation: it's owed back, so it stays
// held until it's refunded. The Sales page's money cards are worked out from these.
const PAID_AT = "coalesce(p.paid_at, p.created_at)";
const FORFEITED = `v.st in ('CANCELLED', 'CANCELED', 'NO_SHOW') and (v.cancelled_at is null or ${PAID_AT}::timestamp <= v.cancelled_at::timestamp)`;
const DOWNPAYMENT_FLOWS = `${APPT} select ${LOCAL_DATE(PAID_AT)} as in_d,
    case when v.tracked_d is not null then v.tracked_d when v.st = 'COMPLETED' then v.d
         when v.st = 'REFUNDED' then v.refund_d when ${FORFEITED} then v.cancel_d end as out_d,
    case when v.tracked_d is not null or v.st = 'COMPLETED' then 'earned' when v.st = 'REFUNDED' then 'refunded'
         when ${FORFEITED} then 'forfeited' end as kind,
    sum(p.amount)::int as amount
  from payments p join appt v on v.id = p.appointment_id
  where upper(trim(p.status)) = 'PAID' group by 1, 2, 3`;
type Flow = { in_d: string; out_d: string | null; kind: "earned" | "refunded" | "forfeited" | null; amount: number };

// The four money figures for a span, from the flows and the visits completed in it (their balances
// and late fees): gross income (money in: downpayments paid, balances paid at the salon, less
// refunds), revenue (what the salon earned: the downpayments and balances of the visits completed
// in it, plus forfeited downpayments; a recorded balance already holds the visit's late fee), other
// income (forfeited downpayments and late fees), refunds, and the downpayments still held at its end
// (unearned: a liability until the visit is done)
function moneyFor(flows: Flow[], span: Span, completed: { balance: number; lateFees: number }) {
  const sum = (pick: (f: Flow) => boolean) => flows.filter(pick).reduce((total, f) => total + f.amount, 0);
  const inSpan = (d: string | null) => d !== null && d >= span.from && d <= span.to;
  const received = sum((f) => inSpan(f.in_d));
  const refunds = sum((f) => f.kind === "refunded" && inSpan(f.out_d));
  const forfeited = sum((f) => f.kind === "forfeited" && inSpan(f.out_d));
  const earned = sum((f) => f.kind === "earned" && inSpan(f.out_d));
  return {
    grossReceipts: received + completed.balance - refunds,
    revenue: earned + completed.balance + forfeited,
    otherIncome: forfeited + completed.lateFees,
    refunds,
    unearned: sum((f) => f.in_d <= span.to && (f.out_d === null || f.out_d > span.to)),
  };
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

// The glance cards' lines, one point per trend bucket: the client accounts with a visit completed
// with the tracker in it, the different services and artists booked in it, and its visits completed
// with the tracker (the trend's bookings)
type GlanceDay = { d: string; services: string[] | null; artists: string[] | null; clients: number[] | null };
function glanceTrend(buckets: Span[], days: GlanceDay[], visits: number[]) {
  return buckets.map((bucket, i) => {
    const inside = days.filter((r) => r.d >= bucket.from && r.d <= bucket.to);
    const distinct = (pick: (r: GlanceDay) => (string | number)[] | null) => new Set(inside.flatMap((r) => pick(r) ?? [])).size;
    return { date: bucket.from, clients: distinct((r) => r.clients), services: distinct((r) => r.services), artists: distinct((r) => r.artists), appointments: visits[i] ?? 0 };
  });
}

export async function listWarmLeads(now: Date = new Date()): Promise<string[]> {
  const found = await rows<{ clerk_id: string }>(`${WARM_LEADS} order by u.clerk_id`, [warmSince(manilaToday(now))]);
  return found.map((r) => r.clerk_id);
}

// Each rate's parts per day, from `from` to `to`, counted as spanMetrics counts them: cancellations
// and decided visits by the visit's day; started and converted bookings by the day started; new
// accounts and those that booked by the day made; and, for the repeat rate, the clients whose first
// visit completed with the tracker since `from` was that day, and how many of them had one before
type RateDay = { d: string; cancelled: number; decided: number; created: number; converted: number; leads: number; booked: number; clients: number; returning: number };
async function rateDayParts(from: string, to: string): Promise<RateDay[]> {
  const p = [from, to];
  const [visits, started, accounts, repeat] = await Promise.all([
    rows<{ d: string; cancelled: number; decided: number }>(
      `${APPT} select d, count(*) filter (where st in ${CANCELLED})::int as cancelled, count(*) filter (where st in ${DECIDED})::int as decided
       from appt where d between $1 and $2 group by d`, p),
    rows<{ d: string; created: number; converted: number }>(
      `${APPT} select created_d as d, count(*)::int as created, count(*) filter (where st in ${BOOKED})::int as converted
       from appt where not is_guest and created_d between $1 and $2 group by created_d`, p),
    rows<{ d: string; leads: number; booked: number }>(
      `select ${LOCAL_DATE("u.created_at")} as d, count(*)::int as leads, count(*) filter (where ${HAS_BOOKED})::int as booked
       from users u where ${CLIENT_ACCOUNT} and ${LOCAL_DATE("u.created_at")} between $1 and $2 group by 1`, p),
    rows<{ d: string; clients: number; returning: number }>(
      `${APPT} select first_in as d, count(*)::int as clients, count(*) filter (where prior)::int as returning
       from (select user_id, min(tracked_d) filter (where tracked_d between $1 and $2) as first_in, bool_or(tracked_d < $1) as prior
             from appt where tracked_d is not null and not is_guest group by user_id) t
       where first_in is not null group by first_in`, p),
  ]);
  const byDay: Record<string, RateDay> = {};
  const day = (d: string) => (byDay[d] ??= { d, cancelled: 0, decided: 0, created: 0, converted: 0, leads: 0, booked: 0, clients: 0, returning: 0 });
  for (const r of visits) Object.assign(day(r.d), { cancelled: r.cancelled, decided: r.decided });
  for (const r of started) Object.assign(day(r.d), { created: r.created, converted: r.converted });
  for (const r of accounts) Object.assign(day(r.d), { leads: r.leads, booked: r.booked });
  for (const r of repeat) Object.assign(day(r.d), { clients: r.clients, returning: r.returning });
  return Object.values(byDay);
}

// The rate cards' lines, one point per trend bucket: each rate so far in the period, from its first
// day to the bucket's end (null while there's nothing to divide by)
function rateTrend(buckets: Span[], days: RateDay[]) {
  return buckets.map((bucket) => {
    const upTo = days.filter((r) => r.d <= bucket.to);
    const total = (key: Exclude<keyof RateDay, "d">) => upTo.reduce((sum, r) => sum + r[key], 0);
    return {
      date: bucket.from,
      cancellation: rate(total("cancelled"), total("decided")),
      conversion: rate(total("converted"), total("created")),
      leadConversion: rate(total("booked"), total("leads")),
      returning: rate(total("returning"), total("clients")),
    };
  });
}

// What is measured for one span (the period, then the one before it)
async function spanMetrics(span: Span) {
  const p = [span.from, span.to];
  const [counts, booked, conversion, returning, leads, served] = await Promise.all([
    // The money cards' balances and late fees: the visits an admin completed with the booking
    // tracker in the period, dated by that day (tracked_d), so never a refunded one, and always with
    // the balance recorded. Cancellations stay by the visit's day.
    one<{ balance_at_salon: number; late_fees: number; cancelled: number; decided: number }>(
      `${APPT} select
         coalesce(sum(${BALANCE}) filter (where tracked_d between $1 and $2), 0)::int as balance_at_salon,
         coalesce(sum(late_fee) filter (where tracked_d between $1 and $2), 0)::int as late_fees,
         count(*) filter (where st in ${CANCELLED} and d between $1 and $2)::int as cancelled,
         count(*) filter (where st in ${DECIDED} and d between $1 and $2)::int as decided
       from appt where d between $1 and $2 or tracked_d between $1 and $2`, p),
    // Appointments: confirmed and completed (the tracker's last step) in the period, dated by the completion
    one<{ n: number }>(`${APPT} select count(*)::int as n from appt where tracked_d between $1 and $2`, p),
    one<{ created: number; converted: number }>(
      `${APPT} select count(*)::int as created, count(*) filter (where st in ${BOOKED})::int as converted
       from appt where not is_guest and created_d between $1 and $2`, p),
    // Repeat rate: of the clients with a visit completed with the tracker in the period, those who
    // had one completed before it
    one<{ clients: number; returning: number }>(
      `${APPT} select count(*)::int as clients, count(*) filter (where prior)::int as returning
       from (select user_id, bool_or(tracked_d < $1) as prior, bool_or(tracked_d between $1 and $2) as inside
             from appt where tracked_d is not null and not is_guest group by user_id) t
       where inside`, p),
    one<{ leads: number; booked: number }>(
      `select count(*)::int as leads, count(*) filter (where ${HAS_BOOKED})::int as booked
       from users u where ${CLIENT_ACCOUNT} and ${LOCAL_DATE("u.created_at")} between $1 and $2`, p),
    // Total clients: client accounts with a visit completed with the tracker in the period
    one<{ n: number }>(
      `select count(distinct a.user_id)::int as n from appointments a
       join visit_completions vc on vc.appointment_id = a.id join users u on u.id = a.user_id
       where upper(trim(a.status)) = 'COMPLETED' and ${CLIENT_ACCOUNT} and ${LOCAL_DATE("vc.created_at")} between $1 and $2`, p),
  ]);
  return {
    bookings: booked.n,
    clientsServed: served.n,
    balanceAtSalon: counts.balance_at_salon,
    lateFees: counts.late_fees,
    decided: counts.decided,
    cancellation: rate(counts.cancelled, counts.decided),
    conversion: rate(conversion.converted, conversion.created),
    returning: rate(returning.returning, returning.clients),
    leadConversion: rate(leads.booked, leads.leads),
    leadAccounts: leads.leads,
    leadBooked: leads.booked,
  };
}

export async function buildDashboard(range: DashboardRange, now: Date = new Date()): Promise<DashboardResponse> {
  const today = manilaToday(now);
  // All time runs from the first day on record (a booking's day, or an account made) to the last
  // booking's day
  const all = range === "all"
    ? await one<{ from: string | null; to: string | null }>(
        `select least((select min(appointment_date) from appointments), (select min(${LOCAL_DATE("created_at")}) from users)) as from,
                (select max(appointment_date) from appointments) as to`, [])
    : null;
  const { period, previous } = resolvePeriod(range, today, all?.from ? { from: all.from, to: all.to ?? today } : undefined);
  const p = [period.from, period.to];
  const { granularity, buckets } = trendBuckets(range, period, today);
  // The bookings chart's bars: coarser than the lines, over the same days
  const barGrouping = trendBuckets(range, period, today, barGranularity(range));
  // The trend line runs from the period's first day to today, so only those days are read
  const trendSpan = buckets.length === 0 ? null : [buckets[0].from, buckets[buckets.length - 1].to];

  // Both counts match the lists they link to on the Appointments screen: "Pending" is the PENDING
  // filter, "Proofs to review" is the PROOF_PENDING filter (an awaiting-proof booking whose latest
  // upload is still pending).
  const [current, before, redeemed, attention, lapsed, outcomeDays, serviceRows, weekdayRows, artistRows, outcomeRows, next, dayAppts, recurringSince, dayBooked, flows, warm, sales, dayMix, mixWeekdays, mixArtists, mixBooked, rateDays] =
    await Promise.all([
      spanMetrics(period),
      spanMetrics(previous),
      // The Salon notes' loyalty rewards redeemed in the period
      one<{ n: number }>(
        `select count(*)::int as n from scan_history where action = 'redeem' and ${LOCAL_DATE("created_at")} between $1 and $2`, p),
      // One pass over the appointments (#25), with the screenshot and visit-to-complete rules
      one<{ today: number; unpaid: number; proofs_to_review: number; to_complete: number; photos_to_add: number }>(
        `select
           count(*) filter (where a.appointment_date = $1 and upper(trim(a.status)) = 'CONFIRMED')::int as today,
           count(*) filter (where upper(trim(a.status)) = 'PENDING')::int as unpaid,
           count(*) filter (where ${PROOF_TO_REVIEW_SQL("a")})::int as proofs_to_review,
           count(*) filter (where ${TO_COMPLETE_SQL("a", today, manilaClock(now))})::int as to_complete,
           count(*) filter (where ${PHOTOS_TO_ADD_SQL("a")})::int as photos_to_add
         from appointments a`, [today]),
      one<{ n: number }>(
        `${APPT} select count(*)::int as n
         from (select user_id, max(tracked_d) as last_d from appt where tracked_d is not null and not is_guest group by user_id) t
         where last_d < $1`, [addDays(today, -LAPSED_DAYS)]),
      // The Dashboard's bookings chart, a bar pair per trend bucket: visits completed (by DONE_D) and
      // cancelled, refunded or no-show (by the visit's day)
      trendSpan
        ? rows<{ d: string; completed: number; cancelled: number }>(
            `${APPT} select d, sum(completed)::int as completed, sum(cancelled)::int as cancelled from (
               select ${DONE_D} as d, 1 as completed, 0 as cancelled from appt where ${DONE_D} between $1 and $2
               union all
               select d, 0, 1 from appt where st in ${CANCELLED} and d between $1 and $2
             ) m group by 1`, trendSpan)
        : Promise.resolve([]),
      // The Sales page's Top services: booked in the period (MIX_BOOKED), and what the completed ones
      // sold for (DONE_D)
      rows<{ name: string; bookings: number; estimated_sales: number }>(
        `${APPT} select service_name as name, count(*)::int as bookings,
           coalesce(sum(${SALE}) filter (where ${DONE_D} is not null), 0)::int as estimated_sales
         from appt where d between $1 and $2 and ${MIX_BOOKED}
         group by service_name order by bookings desc, estimated_sales desc, service_name`, p),
      rows<{ weekday: number; bookings: number }>(
        `${APPT} select extract(isodow from d::date)::int as weekday, count(*)::int as bookings
         from appt where d between $1 and $2 and st in ${BOOKED} group by 1`, p),
      rows<{ name: string; bookings: number }>(
        `${APPT} select nailist_name as name, count(*)::int as bookings
         from appt where d between $1 and $2 and st in ${BOOKED}
         group by nailist_name order by bookings desc, nailist_name`, p),
      // How bookings ended: by status, but from TRACKER_FROM a booking marked Completed without the
      // tracker's Complete visit is left out
      rows<{ st: string; n: number }>(
        `${APPT} select st, count(*)::int as n from appt
         where d between $1 and $2 and not (st = 'COMPLETED' and d >= '${TRACKER_FROM}' and tracked_d is null) group by st`, p),
      rows<DashboardResponse["next"][number]>(
        `${APPT} select id, client_name, service_name, nailist_name, d as appointment_date, t as appointment_time
         from appt
         where st = 'CONFIRMED' and (d > $1 or (d = $1 and lpad(split_part(t, '-', 1), 5, '0') >= $2))
         order by d, lpad(split_part(t, '-', 1), 5, '0'), id limit 5`, [today, manilaClock(now)]),
      // The money cards' balances and late fees day by day, for their lines
      trendSpan
        ? rows<{ d: string; balance: number; late_fees: number }>(
            `${APPT} select tracked_d as d,
               coalesce(sum(${BALANCE}), 0)::int as balance,
               coalesce(sum(late_fee), 0)::int as late_fees
             from appt where tracked_d between $1 and $2 group by tracked_d`, trendSpan)
        : Promise.resolve([]),
      // The Salon notes' returning clients: the day each client's second visit was completed with the
      // tracker, the day they became one; the walk-in guest isn't a client
      rows<{ d: string; n: number }>(
        `${APPT} select second_d as d, count(*)::int as n from (
           select user_id, (array_agg(tracked_d order by tracked_d))[2] as second_d
           from appt where tracked_d is not null and not is_guest group by user_id
         ) t where second_d is not null group by 1`, []),
      // The visits completed with the tracker, day by day (the Appointments card's line)
      trendSpan
        ? rows<{ d: string; n: number }>(
            `${APPT} select tracked_d as d, count(*)::int as n from appt where tracked_d between $1 and $2 group by 1`, trendSpan)
        : Promise.resolve([]),
      rows<Flow>(DOWNPAYMENT_FLOWS, []),
      one<{ n: number }>(`select count(*)::int as n from (${WARM_LEADS}) w`, [warmSince(today)]),
      rows<DashboardResponse["sales"][number]>(
        `${APPT} select id, d as date, t as time, coalesce(nullif(client_name, ''), 'Client') as client_name,
           case when is_guest then null else user_id end as user_id, service_name, nailist_name, ${SALE}::int as fee
         from appt where tracked_d between $1 and $2
         order by tracked_d desc, d desc, lpad(split_part(t, '-', 1), 5, '0') desc, id desc`, p),
      // The glance cards' lines, per day (merged per week or month below, so a service booked on two
      // days of a week counts once): the services and artists booked (MIX_BOOKED, by the visit's
      // day), and the client accounts with a visit completed with the tracker (by the day completed)
      trendSpan
        ? rows<GlanceDay>(
            `${APPT} select d, to_json(array_agg(distinct service_name) filter (where service_name is not null)) as services,
                    to_json(array_agg(distinct nailist_name) filter (where nailist_name is not null)) as artists,
                    to_json(array_agg(distinct client) filter (where client is not null)) as clients
             from (
               select d, service_name, nailist_name, null::int as client from appt where d between $1 and $2 and ${MIX_BOOKED}
               union all
               select ${LOCAL_DATE("vc.created_at")}, null, null, a.user_id from appointments a
               join visit_completions vc on vc.appointment_id = a.id join users u on u.id = a.user_id
               where upper(trim(a.status)) = 'COMPLETED' and ${CLIENT_ACCOUNT} and ${LOCAL_DATE("vc.created_at")} between $1 and $2
             ) m group by d`, trendSpan)
        : Promise.resolve([]),
      // The Dashboard's Salon notes: the weekdays and artists booked in the period (MIX_BOOKED)
      rows<{ weekday: number; bookings: number }>(
        `${APPT} select extract(isodow from d::date)::int as weekday, count(*)::int as bookings
         from appt where d between $1 and $2 and ${MIX_BOOKED} group by 1`, p),
      rows<{ name: string; bookings: number }>(
        `${APPT} select nailist_name as name, count(*)::int as bookings
         from appt where d between $1 and $2 and ${MIX_BOOKED} group by nailist_name order by bookings desc, nailist_name`, p),
      // Total services and Artists: how many different services and artists were booked (MIX_BOOKED,
      // by the visit's day) in the period and in the one before
      one<{ services: number; services_before: number; artists: number; artists_before: number }>(
        `${APPT} select
           count(distinct service_name) filter (where d between $1 and $2)::int as services,
           count(distinct service_name) filter (where d between $3 and $4)::int as services_before,
           count(distinct nailist_name) filter (where d between $1 and $2)::int as artists,
           count(distinct nailist_name) filter (where d between $3 and $4)::int as artists_before
         from appt where ${MIX_BOOKED}`, [period.from, period.to, previous.from, previous.to]),
      // The rate cards' lines: each rate's two parts per day, counted as spanMetrics counts them
      trendSpan ? rateDayParts(trendSpan[0], trendSpan[1]) : Promise.resolve([]),
    ]);

  const byDay: Record<string, Partial<DayValues>> = {};
  const day = (d: string) => (byDay[d] ??= {});
  const completedDays = dayAppts as { d: string; balance: number; late_fees: number }[];
  for (const r of dayBooked as { d: string; n: number }[]) day(r.d).bookings = r.n;

  // Five rows at most, Other included: with more than five services, the top four and Other
  const topOf = (found: { name: string; bookings: number; estimated_sales: number }[]) => {
    const shown = found.length > 5 ? 4 : 5;
    const top = found.slice(0, shown).map((r) => ({ name: r.name, bookings: r.bookings, estimatedSales: r.estimated_sales }));
    const other = found.slice(shown);
    if (other.length > 0) {
      top.push({
        name: "Other",
        bookings: other.reduce((sum, r) => sum + r.bookings, 0),
        estimatedSales: other.reduce((sum, r) => sum + r.estimated_sales, 0),
      });
    }
    return top;
  };
  // Monday to Sunday, a day with no bookings at 0
  const everyWeekday = (found: { weekday: number; bookings: number }[]) =>
    Array.from({ length: 7 }, (_, i) => ({ weekday: i + 1, bookings: found.find((r) => r.weekday === i + 1)?.bookings ?? 0 }));

  // Returning clients as of a day: those whose second completed visit came on or before it, counted
  // as of the period's end (today at the latest)
  const recurringBy = (day: string) => (recurringSince as { d: string; n: number }[]).reduce((sum, r) => (r.d <= day ? sum + r.n : sum), 0);
  const asOf = (span: Span) => recurringBy(span.to < today ? span.to : today);
  const trend = bucketTrend(granularity, buckets, byDay);
  // The money cards: the period (its held downpayments as of today at the latest), the one before,
  // and a point per trend bucket
  const flowRows = flows as Flow[];
  const money = (span: Span, metrics: { balanceAtSalon: number; lateFees: number }) =>
    moneyFor(flowRows, { from: span.from, to: span.to < today ? span.to : today }, { balance: metrics.balanceAtSalon, lateFees: metrics.lateFees });
  const moneyNow = money(period, current);
  const moneyBefore = money(previous, before);
  const moneyPoints = buckets.map((bucket) => {
    const inside = completedDays.filter((r) => r.d >= bucket.from && r.d <= bucket.to);
    const completed = { balance: inside.reduce((t, r) => t + r.balance, 0), lateFees: inside.reduce((t, r) => t + r.late_fees, 0) };
    return { date: bucket.from, ...moneyFor(flowRows, bucket, completed) };
  });
  const outcome = (...statuses: string[]) => outcomeRows.filter((r) => statuses.includes(r.st)).reduce((sum, r) => sum + r.n, 0);

  return {
    range,
    period,
    previous,
    rates: {
      cancellation: { value: current.cancellation, previous: before.cancellation },
      conversion: { value: current.conversion, previous: before.conversion },
      returning: { value: current.returning, previous: before.returning },
      leadConversion: { value: current.leadConversion, previous: before.leadConversion },
    },
    lapsedClients: lapsed.n,
    leads: { accounts: current.leadAccounts, booked: current.leadBooked },
    sales,
    totals: {
      clients: { value: current.clientsServed, previous: before.clientsServed },
      services: { value: mixBooked.services, previous: mixBooked.services_before },
      artists: { value: mixBooked.artists, previous: mixBooked.artists_before },
      appointments: { value: current.bookings, previous: before.bookings },
      trend: glanceTrend(buckets, dayMix, trend.points.map((point) => point.bookings)),
    },
    trend,
    rateTrend: rateTrend(buckets, rateDays),
    attention: { today: attention.today, proofsToReview: attention.proofs_to_review, toComplete: attention.to_complete, photosToAdd: attention.photos_to_add, unpaid: attention.unpaid, warmLeads: warm.n },
    money: {
      grossReceipts: { value: moneyNow.grossReceipts, previous: moneyBefore.grossReceipts },
      unearned: { value: moneyNow.unearned, previous: moneyBefore.unearned },
      revenue: { value: moneyNow.revenue, previous: moneyBefore.revenue },
      otherIncome: { value: moneyNow.otherIncome, previous: moneyBefore.otherIncome },
      refunds: { value: moneyNow.refunds, previous: moneyBefore.refunds },
      points: moneyPoints,
    },
    bookingsTrend: {
      granularity: barGrouping.granularity,
      points: barGrouping.buckets.map((bucket) => {
        const inside = outcomeDays.filter((r) => r.d >= bucket.from && r.d <= bucket.to);
        return { date: bucket.from, completed: inside.reduce((t, r) => t + r.completed, 0), cancelled: inside.reduce((t, r) => t + r.cancelled, 0) };
      }),
    },
    services: topOf(serviceRows),
    weekdays: everyWeekday(weekdayRows),
    artists: artistRows,
    overview: {
      services: topOf(serviceRows),
      weekdays: everyWeekday(mixWeekdays),
      artists: mixArtists,
      decided: current.decided,
      cancellation: current.cancellation,
      conversion: current.conversion,
      returningClients: asOf(period),
      loyaltyRedeemed: redeemed.n,
    },
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
