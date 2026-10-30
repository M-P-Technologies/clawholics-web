import "server-only";
import { requireAdmin } from "../auth";
import { getBirthdayDiscountPct } from "../birthdayVouchers";
import { getBookingHoldMinutes, MAX_BOOKING_HOLD_MINUTES, MIN_BOOKING_HOLD_MINUTES } from "../bookingHold";
import { getBookingMinNoticeHours, MAX_MIN_NOTICE_HOURS, MIN_MIN_NOTICE_HOURS } from "../bookingNotice";
import { getSql } from "../db";
import { getRemindersEnabled } from "../reminders";
import { readJson } from "../http";
import { getLoyaltyStampsRequired, MAX_LOYALTY_STAMPS } from "../loyalty";
import { getPaymentSettings, validatePaymentSettings } from "../payments";
import { ported } from "../worker";

// The salon's settings (table site_settings), edited together in Admin > Settings. The payment
// ones are also public through /settings/payment, and the loyalty card's through /settings/loyalty;
// the booking hold is read by booking itself.

export interface SalonSettings {
  downpayment_amount: number;
  payment_methods: string[];
  birthday_discount_pct: number;
  loyalty_stamps_required: number;
  booking_hold_minutes: number;
  booking_min_notice_hours: number;
  /** Whether clients get a reminder email the day before their visit */
  booking_reminders_enabled: boolean;
}

async function getSalonSettings(): Promise<SalonSettings> {
  const [payment, birthdayDiscountPct, stampsRequired, holdMinutes, minNoticeHours, remindersEnabled] = await Promise.all([
    getPaymentSettings(),
    getBirthdayDiscountPct(),
    getLoyaltyStampsRequired(),
    getBookingHoldMinutes(),
    getBookingMinNoticeHours(),
    getRemindersEnabled(),
  ]);
  return {
    ...payment,
    birthday_discount_pct: birthdayDiscountPct,
    loyalty_stamps_required: stampsRequired,
    booking_hold_minutes: holdMinutes,
    booking_min_notice_hours: minNoticeHours,
    booking_reminders_enabled: remindersEnabled,
  };
}

const isWholeIn = (value: unknown, min: number, max: number) => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

/** An error message, or null when the body is a valid settings update. */
function validateSalonSettings(body: unknown): string | null {
  const paymentError = validatePaymentSettings(body);
  if (paymentError) return paymentError;
  const { birthday_discount_pct: pct, loyalty_stamps_required: stamps, booking_hold_minutes: hold, booking_min_notice_hours: notice, booking_reminders_enabled: reminders } = body as Record<string, unknown>;
  if (!isWholeIn(pct, 1, 100)) return "birthday_discount_pct must be a whole number from 1 to 100.";
  if (!isWholeIn(stamps, 1, MAX_LOYALTY_STAMPS)) return `loyalty_stamps_required must be a whole number from 1 to ${MAX_LOYALTY_STAMPS}.`;
  if (!isWholeIn(hold, MIN_BOOKING_HOLD_MINUTES, MAX_BOOKING_HOLD_MINUTES)) {
    return `booking_hold_minutes must be a whole number from ${MIN_BOOKING_HOLD_MINUTES} to ${MAX_BOOKING_HOLD_MINUTES}.`;
  }
  if (!isWholeIn(notice, MIN_MIN_NOTICE_HOURS, MAX_MIN_NOTICE_HOURS)) {
    return `booking_min_notice_hours must be a whole number from ${MIN_MIN_NOTICE_HOURS} to ${MAX_MIN_NOTICE_HOURS}.`;
  }
  if (typeof reminders !== "boolean") return "booking_reminders_enabled must be true or false.";
  return null;
}

// GET /settings/loyalty (public): the stamps a loyalty card needs for a reward
export const getLoyaltySettings = ported(async () => Response.json({ stamps_required: await getLoyaltyStampsRequired() }));

// GET /settings/booking (public): the notice a booking needs, which the booking calendar applies
export const getBookingSettings = ported(async () => Response.json({ min_notice_hours: await getBookingMinNoticeHours() }));

// GET /settings (admin)
export const getSettings = ported(async () => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  return Response.json(await getSalonSettings());
});

// PUT /settings (admin): every setting at once
export const updateSettings = ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<Partial<SalonSettings>>(req);
  const validationError = validateSalonSettings(body);
  if (validationError) return Response.json({ error: validationError, message: validationError }, { status: 400 });

  await getSql().begin(async (tx) => {
    for (const [key, value] of [
      ["downpayment_amount", String(body.downpayment_amount)],
      ["payment_methods", JSON.stringify(body.payment_methods)],
      ["birthday_discount_pct", String(body.birthday_discount_pct)],
      ["loyalty_stamps_required", String(body.loyalty_stamps_required)],
      ["booking_hold_minutes", String(body.booking_hold_minutes)],
      ["booking_min_notice_hours", String(body.booking_min_notice_hours)],
      ["booking_reminders_enabled", body.booking_reminders_enabled ? "1" : "0"],
    ]) {
      await tx`
        insert into site_settings (key, value, updated_at) values (${key}, ${value}, clawholics_utc_now())
        on conflict (key) do update set value = excluded.value, updated_at = clawholics_utc_now()
      `;
    }
  });
  return Response.json(await getSalonSettings());
});
