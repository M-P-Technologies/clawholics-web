// The salon's policy numbers, edited in Admin > Settings > Policies: how far ahead a booking can
// still be changed or refunded, and the fees for arriving late. The server enforces them and the
// pages and emails quote them, so both read the same values (the browser through
// GET /settings/policy). Their Terms & Conditions text is written by hand and should say the same.

export interface SalonPolicy {
  /** Hours before a visit until which a client can reschedule or cancel with a refund */
  change_window_hours: number;
  /** Minutes late from which the first late fee applies, and its amount in pesos */
  late_fee_1_minutes: number;
  late_fee_1_amount: number;
  /** Minutes late from which the second (higher) late fee applies, and its amount */
  late_fee_2_minutes: number;
  late_fee_2_amount: number;
  /** Minutes late from which the terms cancel the visit and keep the downpayment */
  late_cancel_minutes: number;
}

/** What the salon's terms said before these were editable */
export const DEFAULT_POLICY: SalonPolicy = {
  change_window_hours: 72,
  late_fee_1_minutes: 15,
  late_fee_1_amount: 100,
  late_fee_2_minutes: 20,
  late_fee_2_amount: 150,
  late_cancel_minutes: 25,
};

export const POLICY_KEYS = Object.keys(DEFAULT_POLICY) as (keyof SalonPolicy)[];

export const MIN_CHANGE_WINDOW_HOURS = 1;
export const MAX_CHANGE_WINDOW_HOURS = 336;
export const MIN_LATE_MINUTES = 1;
export const MAX_LATE_MINUTES = 180;
export const MAX_LATE_FEE = 10000;

const isWhole = (value: unknown, min: number, max: number) => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

/** What's wrong with these numbers, or null when they can be saved */
export function policyProblem(policy: SalonPolicy): string | null {
  if (!isWhole(policy.change_window_hours, MIN_CHANGE_WINDOW_HOURS, MAX_CHANGE_WINDOW_HOURS)) {
    return `The change window must be a whole number of hours from ${MIN_CHANGE_WINDOW_HOURS} to ${MAX_CHANGE_WINDOW_HOURS}.`;
  }
  for (const key of ["late_fee_1_minutes", "late_fee_2_minutes", "late_cancel_minutes"] as const) {
    if (!isWhole(policy[key], MIN_LATE_MINUTES, MAX_LATE_MINUTES)) return `Late minutes must be whole numbers from ${MIN_LATE_MINUTES} to ${MAX_LATE_MINUTES}.`;
  }
  for (const key of ["late_fee_1_amount", "late_fee_2_amount"] as const) {
    if (!isWhole(policy[key], 0, MAX_LATE_FEE)) return `A late fee must be a whole number of pesos from 0 to ${MAX_LATE_FEE.toLocaleString("en-PH")}.`;
  }
  if (policy.late_fee_2_minutes <= policy.late_fee_1_minutes) return "The second late fee must start later than the first.";
  if (policy.late_cancel_minutes <= policy.late_fee_2_minutes) return "Cancelling for lateness must start later than the second late fee.";
  if (policy.late_fee_2_amount < policy.late_fee_1_amount) return "The second late fee can't be lower than the first.";
  return null;
}

/** The policy from saved values (text or numbers by key): the defaults for anything missing, and all
 *  of them when what was saved doesn't hold together */
export function readPolicy(values: Record<string, unknown> | null | undefined): SalonPolicy {
  const policy = { ...DEFAULT_POLICY };
  for (const key of POLICY_KEYS) {
    const raw = values?.[key];
    const number = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw.trim()) ? Number(raw) : NaN;
    if (Number.isInteger(number)) policy[key] = number;
  }
  return policyProblem(policy) ? { ...DEFAULT_POLICY } : policy;
}

/** "72 hours": always in hours, for the emails and the admin screens */
export const hoursOnly = (hours: number) => (hours === 1 ? "1 hour" : `${hours} hours`);

/** "72 hours", "3 days" (from two days, in whole days), "1 hour" */
export function hoursLabel(hours: number): string {
  if (hours >= 48 && hours % 24 === 0) return `${hours / 24} days`;
  return hours === 1 ? "1 hour" : `${hours} hours`;
}
