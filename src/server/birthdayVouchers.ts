import "server-only";
import { getSql } from "./db";
import { sendBirthdayVoucherEmails } from "./email";

// Birthday vouchers (table from migration 20261018000000_birthday_vouchers.sql): one a year for
// each client whose birthday is this month, valid for the month. The daily cron issues and
// emails them (issueBirthdayVouchers); the client claims theirs from the pop-up or their profile.
// Months and days are Manila's.

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
export const DEFAULT_BIRTHDAY_DISCOUNT_PCT = 20;

const MANILA_OFFSET_MS = 8 * 3600 * 1000;
/** Resend's batch endpoint takes at most 100 emails a call */
const EMAIL_BATCH_SIZE = 100;

/** Manila's date: today (YYYY-MM-DD), the year, the month (01-12) and that month's first and last day */
export function manilaMonth(now: Date) {
  const today = new Date(now.getTime() + MANILA_OFFSET_MS).toISOString().slice(0, 10);
  const [year, month] = [Number(today.slice(0, 4)), today.slice(5, 7)];
  const lastDay = new Date(Date.UTC(year, Number(month), 0)).getUTCDate();
  return { today, year, month, firstDay: `${year}-${month}-01`, lastDay: `${year}-${month}-${String(lastDay).padStart(2, "0")}` };
}

async function discountPct(): Promise<number> {
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

  const pct = await discountPct();
  // Clients (not admins) with a full YYYY-MM-DD birthday in this month and an email to send to
  const issued = await sql`
    insert into birthday_vouchers (user_id, year, code, discount_pct, valid_from, valid_until)
    select u.id, ${year}, 'BDAY-' || upper(substr(md5(random()::text || u.id::text || clock_timestamp()::text), 1, 10)),
      ${pct}, ${firstDay}, ${lastDay}
    from users u
    join customer_profiles cp on cp.user_id = u.id
    where coalesce(u.role, 'customer') <> 'admin'
      and cp.dob ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
      and substr(cp.dob, 6, 2) = ${month}
      and coalesce(u.email, '') <> ''
    on conflict (user_id, year) do nothing`;

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
