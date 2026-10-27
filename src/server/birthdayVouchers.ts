import "server-only";
import type { TransactionSql } from "postgres";
import { SERVICE_PRICE_SQL } from "./appointments";
import { getSql } from "./db";
import { pgErrorCode } from "./http";
import { sendBirthdayVoucherEmails } from "./email";

// Birthday vouchers (table from migration 20261018000000_birthday_vouchers.sql): one a year for
// each client whose birthday is this month, valid for the month. The daily cron issues and
// emails them (issueBirthdayVouchers); the client claims theirs from the pop-up or their profile,
// and the admin redeems it when completing the visit (checkVoucherForVisit, useVoucherOn), which
// marks it USED by that appointment. Months and days are Manila's.

export type VoucherStatus = "ISSUED" | "CLAIMED" | "USED" | "EXPIRED";

export interface BirthdayVoucher {
  id: number;
  code: string;
  discount_pct: number;
  valid_from: string;
  valid_until: string;
  status: VoucherStatus;
  claimed_at: string | null;
}

/** Used when the site setting is missing or unreadable */
const DEFAULT_BIRTHDAY_DISCOUNT_PCT = 20;

const MANILA_OFFSET_MS = 8 * 3600 * 1000;
/**
 * Voucher codes: 8 characters from letters and digits that can't be misread (no 0/O, 1/I/L), so
 * they're easy to read out at the salon. 31^8 codes; a code can only be used on its own client's visit.
 */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/** Resend's batch endpoint takes at most 100 emails a call */
const EMAIL_BATCH_SIZE = 100;

/** Manila's date: today (YYYY-MM-DD), the year, the month (01-12) and that month's first and last day */
export function manilaMonth(now: Date) {
  const today = new Date(now.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
  const [year, month] = [Number(today.slice(0, 4)), today.slice(5, 7)];
  const lastDay = new Date(Date.UTC(year, Number(month), 0)).getUTCDate();
  return { today, year, month, firstDay: `${year}-${month}-01`, lastDay: `${year}-${month}-${String(lastDay).padStart(2, "0")}` };
}

/** The site setting birthday_discount_pct: the percentage off on vouchers issued from now on */
export async function getBirthdayDiscountPct(): Promise<number> {
  const [row] = await getSql()<{ value: string }[]>`select value from site_settings where key = 'birthday_discount_pct'`;
  const pct = Number(row?.value);
  return Number.isInteger(pct) && pct >= 1 && pct <= 100 ? pct : DEFAULT_BIRTHDAY_DISCOUNT_PCT;
}

/**
 * The daily run. Safe to repeat: a client gets one voucher a year (unique user and year), and
 * each voucher is emailed once (emailed_at is set before sending, and cleared again if Resend
 * refuses the batch, so the next run tries again). Clients who add or change their birthday
 * during the month are picked up by the next day's run.
 */
export async function issueBirthdayVouchers(now = new Date()) {
  const sql = getSql();
  const { today, year, month, firstDay, lastDay } = manilaMonth(now);

  const expired = await sql`
    update birthday_vouchers set status = 'EXPIRED'
    where status in ('ISSUED', 'CLAIMED') and valid_until < ${today}`;

  const pct = await getBirthdayDiscountPct();
  // Clients (not admins) with a full YYYY-MM-DD birthday in this month and an email to send to
  const issue = () => sql`
    insert into birthday_vouchers (user_id, year, code, discount_pct, valid_from, valid_until)
    select u.id, ${year},
      -- A new code per client (the subquery reads u.id, so it isn't run once for every row)
      (select string_agg(substr(${CODE_ALPHABET}, 1 + floor(random() * ${CODE_ALPHABET.length})::int, 1), '')
       from generate_series(1, ${CODE_LENGTH}) where u.id is not null),
      ${pct}, ${firstDay}, ${lastDay}
    from users u
    join customer_profiles cp on cp.user_id = u.id
    where coalesce(u.role, 'customer') <> 'admin'
      and cp.dob ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      and substr(cp.dob, 6, 2) = ${month}
      and coalesce(u.email, '') <> ''
    on conflict (user_id, year) do nothing`;
  // A new code that (rarely) matches an existing one fails the whole insert: try again with new codes
  let issued: Awaited<ReturnType<typeof issue>> | undefined;
  for (let attempt = 1; !issued; attempt++) {
    try {
      issued = await issue();
    } catch (error) {
      const constraint = (error as { constraint_name?: string }).constraint_name;
      if (pgErrorCode(error) !== "23505" || constraint !== "birthday_vouchers_code_key" || attempt >= 3) throw error;
    }
  }

  // This month's vouchers not emailed yet, taken by this run so a run at the same time can't send them too
  const toEmail = await sql<{ id: number; email: string; first_name: string; code: string; discount_pct: number; valid_until: string }[]>`
    update birthday_vouchers v set emailed_at = clawholics_utc_now()
    from users u, customer_profiles cp
    where u.id = v.user_id and cp.user_id = v.user_id
      and v.emailed_at is null and v.valid_from = ${firstDay}
      and v.status in ('ISSUED', 'CLAIMED')
    returning v.id, u.email, cp.first_name, v.code, v.discount_pct, v.valid_until`;

  let emailed = 0;
  for (let i = 0; i < toEmail.length; i += EMAIL_BATCH_SIZE) {
    const batch = toEmail.slice(i, i + EMAIL_BATCH_SIZE);
    try {
      await sendBirthdayVoucherEmails(batch);
      emailed += batch.length;
    } catch (error) {
      console.error("[birthday] could not email vouchers; they're retried on the next run:", error);
      const ids = batch.map((v) => v.id);
      await sql`update birthday_vouchers set emailed_at = null where id in ${sql(ids)}`;
    }
  }

  return { date: today, issued: issued.count, emailed, expired: expired.count };
}

/** The client's voucher for this year's birthday month, or null; one past its month reads EXPIRED */
export async function getCurrentVoucher(userId: number, now = new Date()): Promise<BirthdayVoucher | null> {
  const { today, year } = manilaMonth(now);
  const [row] = await getSql()<BirthdayVoucher[]>`
    select id, code, discount_pct, valid_from, valid_until, status, claimed_at
    from birthday_vouchers where user_id = ${userId} and year = ${year}`;
  if (!row) return null;
  const lapsed = (row.status === "ISSUED" || row.status === "CLAIMED") && row.valid_until < today;
  return lapsed ? { ...row, status: "EXPIRED" } : row;
}

/** Claims the client's voucher while it's valid. Claiming twice answers the claimed voucher. */
export async function claimVoucher(userId: number, now = new Date()): Promise<BirthdayVoucher | "none" | "not-claimable"> {
  const { today, year } = manilaMonth(now);
  const [row] = await getSql()<BirthdayVoucher[]>`
    update birthday_vouchers set status = 'CLAIMED', claimed_at = coalesce(claimed_at, clawholics_utc_now())
    where user_id = ${userId} and year = ${year}
      and status in ('ISSUED', 'CLAIMED') and valid_from <= ${today} and valid_until >= ${today}
    returning id, code, discount_pct, valid_from, valid_until, status, claimed_at`;
  if (row) return row;
  return (await getCurrentVoucher(userId, now)) ? "not-claimable" : "none";
}

type Db = ReturnType<typeof getSql> | TransactionSql;

/** A voucher that can go on a visit, and the pesos it takes off the visit's service price */
export interface VoucherForVisit {
  id: number;
  code: string;
  discount_pct: number;
  valid_until: string;
  discount: number;
}

const DATE_LABEL = (ymd: string) =>
  new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * Whether `code` can go on this visit: the visit's client's own voucher, not used on another
 * visit, and the visit falls in the voucher's month (so a visit completed after the month ends
 * still counts, and an EXPIRED one is fine if the visit was in time). The discount is the
 * voucher's percentage of the service's menu price, in whole pesos.
 */
export async function checkVoucherForVisit(db: Db, code: string, appointmentId: number): Promise<VoucherForVisit | { error: string }> {
  const wanted = code.trim().toUpperCase();
  if (!wanted) return { error: "Enter the voucher code." };
  const [row] = await db<
    (VoucherForVisit & {
      user_id: number; status: VoucherStatus; valid_from: string; used_by: number | null; visit_user: number | null; visit_date: string | null;
      price: number | null; saved_discount: number | null;
    })[]
  >`
    select v.id, v.code, v.discount_pct, v.valid_from, v.valid_until, v.user_id, v.status, v.appointment_id as used_by,
      a.user_id as visit_user, a.appointment_date as visit_date,
      (select vc.voucher_discount from visit_completions vc where vc.appointment_id = a.id) as saved_discount,
      (select ${db.unsafe(SERVICE_PRICE_SQL)} from services s
        left join nailists n on n.id = a.nailist_id
        left join nailist_categories nc on nc.id = n.category_id
        where s.id = a.service_id) as price
    from birthday_vouchers v
    left join appointments a on a.id = ${appointmentId}
    where v.code = ${wanted}`;
  if (!row) return { error: "No voucher has this code." };
  if (row.user_id !== row.visit_user) return { error: "This voucher isn't this client's." };
  // USED without a visit (its appointment was deleted) stays used
  if (row.used_by !== appointmentId && (row.used_by !== null || row.status === "USED")) {
    return { error: "This voucher was already used on another visit." };
  }
  if (!row.visit_date || row.visit_date < row.valid_from || row.visit_date > row.valid_until) {
    return { error: `This voucher is only for visits from ${DATE_LABEL(row.valid_from)} to ${DATE_LABEL(row.valid_until)}.` };
  }
  if (row.price === null) return { error: "This visit's service has no price to take the discount from." };
  // Already on this visit: keeps the discount it was given, even if the menu price changed since
  const kept = row.used_by === appointmentId && row.saved_discount ? row.saved_discount : null;
  return {
    id: row.id,
    code: row.code,
    discount_pct: row.discount_pct,
    valid_until: row.valid_until,
    discount: kept ?? Math.round((Number(row.price) * row.discount_pct) / 100),
  };
}

/** Frees the voucher this visit used, if any (the visit was edited without it, or is no longer completed) */
export async function releaseVoucherOf(db: Db, appointmentId: number, now = new Date()) {
  const { today } = manilaMonth(now);
  // Back to what it was: claimed or not, or expired if its month is over
  await db`
    update birthday_vouchers
    set status = case when valid_until < ${today} then 'EXPIRED' when claimed_at is not null then 'CLAIMED' else 'ISSUED' end,
      used_at = null, appointment_id = null
    where appointment_id = ${appointmentId}`;
}

/**
 * Puts the voucher on the visit: USED by it, and any other voucher it had is freed. False when
 * another visit took the voucher meanwhile.
 */
export async function useVoucherOn(db: Db, voucherId: number, appointmentId: number, now = new Date()): Promise<boolean> {
  const [current] = await db<{ id: number }[]>`select id from birthday_vouchers where appointment_id = ${appointmentId}`;
  if (current && current.id !== voucherId) await releaseVoucherOf(db, appointmentId, now);
  // Not on another visit, and not left USED by a deleted one, as checked: the check ran before the transaction
  const [used] = await db`
    update birthday_vouchers set status = 'USED', used_at = coalesce(used_at, clawholics_utc_now()), appointment_id = ${appointmentId}
    where id = ${voucherId}
      and (appointment_id = ${appointmentId} or (appointment_id is null and status <> 'USED'))
    returning id`;
  return Boolean(used);
}

/** The client's voucher this year, for the client page: with the visit it was used on */
export async function voucherForClientPage(userId: number, now = new Date()) {
  const voucher = await getCurrentVoucher(userId, now);
  if (!voucher) return null;
  const [row] = await getSql()<{ used_at: string | null; appointment_id: number | null; appointment_date: string | null }[]>`
    select v.used_at, v.appointment_id, a.appointment_date
    from birthday_vouchers v left join appointments a on a.id = v.appointment_id where v.id = ${voucher.id}`;
  return { ...voucher, used_at: row?.used_at ?? null, used_on: row?.appointment_date ?? null };
}
