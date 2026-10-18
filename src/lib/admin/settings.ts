import type { SalonSettings } from "../../services/settingsService";
import { MAX_BOOKING_HOLD_MINUTES as MAX_HOLD_MINUTES, MIN_BOOKING_HOLD_MINUTES as MIN_HOLD_MINUTES } from "../bookingHold";

// Admin > Settings: the form's values (text while typing) and the ways to pay it offers

export interface SettingsForm {
  downpayment: string;
  methods: string[];
  birthdayPct: string;
  stampsRequired: string;
  holdMinutes: string;
}

/** The ways to pay the downpayment the site has screens for, by their payment_methods code */
export const PAYMENT_METHOD_CHOICES = [
  { value: "QRPH", label: "QR Ph (online)", hint: "Always on. Clients pay on the payment page by scanning a QR code with any bank or e-wallet app, through Xendit." },
  { value: "MANUAL", label: "Payment proof", hint: "Clients pay outside the site and upload a photo of the receipt, which an admin reviews." },
];

const MAX_DOWNPAYMENT = 100000;
/** The most stamps a loyalty card can need (the card shows one box per stamp) */
export const MAX_LOYALTY_STAMPS = 20;
/** The shortest and longest a new booking can hold its slot while the client pays, in minutes */
export { MIN_BOOKING_HOLD_MINUTES as MIN_HOLD_MINUTES, MAX_BOOKING_HOLD_MINUTES as MAX_HOLD_MINUTES } from "../bookingHold";

export const toForm = (settings: SalonSettings): SettingsForm => ({
  downpayment: String(settings.downpayment_amount),
  // Only the choices above: other saved Xendit channels have no screen and are dropped on save
  methods: PAYMENT_METHOD_CHOICES.map((c) => c.value).filter((m) => settings.payment_methods.includes(m)),
  birthdayPct: String(settings.birthday_discount_pct),
  stampsRequired: String(settings.loyalty_stamps_required),
  holdMinutes: String(settings.booking_hold_minutes),
});

export const sameForm = (a: SettingsForm, b: SettingsForm) =>
  a.downpayment === b.downpayment && a.birthdayPct === b.birthdayPct && a.stampsRequired === b.stampsRequired && a.holdMinutes === b.holdMinutes && [...a.methods].sort().join() === [...b.methods].sort().join();

const wholeNumber = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : NaN);

/** What's wrong with the form, or null when it can be saved */
export function settingsProblem(form: SettingsForm): string | null {
  const amount = wholeNumber(form.downpayment);
  if (!(amount >= 1 && amount <= MAX_DOWNPAYMENT)) return `The downpayment must be a whole number of pesos from 1 to ${MAX_DOWNPAYMENT.toLocaleString("en-PH")}.`;
  if (!form.methods.includes("QRPH")) return "QR Ph must stay on: it's the only way to pay on the payment page.";
  const pct = wholeNumber(form.birthdayPct);
  if (!(pct >= 1 && pct <= 100)) return "The birthday discount must be a whole number from 1 to 100.";
  const stamps = wholeNumber(form.stampsRequired);
  if (!(stamps >= 1 && stamps <= MAX_LOYALTY_STAMPS)) return `The stamps for a reward must be a whole number from 1 to ${MAX_LOYALTY_STAMPS}.`;
  const hold = wholeNumber(form.holdMinutes);
  if (!(hold >= MIN_HOLD_MINUTES && hold <= MAX_HOLD_MINUTES)) return `The slot hold must be a whole number of minutes from ${MIN_HOLD_MINUTES} to ${MAX_HOLD_MINUTES}.`;
  return null;
}

export const fromForm = (form: SettingsForm): SalonSettings => ({
  downpayment_amount: wholeNumber(form.downpayment),
  payment_methods: form.methods,
  birthday_discount_pct: wholeNumber(form.birthdayPct),
  loyalty_stamps_required: wholeNumber(form.stampsRequired),
  booking_hold_minutes: wholeNumber(form.holdMinutes),
});
