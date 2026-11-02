import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY as POLICY } from "@/lib/policy";
import { fromForm, sameForm, settingsProblem, settingsProblemIn, toForm } from "@/lib/admin/settings";

describe("admin settings form", () => {
  const form = toForm({ downpayment_amount: 500, payment_methods: ["GCASH", "MANUAL", "QRPH"], birthday_discount_pct: 20, loyalty_stamps_required: 8, booking_hold_minutes: 5, booking_min_notice_hours: 2, booking_max_advance_days: 30, booking_reminders_enabled: true, rebook_nudge_days: 0, ...POLICY });

  it("keeps only the ways to pay the site has screens for", () => {
    expect(form).toEqual({ downpayment: "500", methods: ["QRPH", "MANUAL"], birthdayPct: "20", stampsRequired: "8", holdMinutes: "5", noticeHours: "2", advanceDays: "30", reminders: true, rebookDays: "0", changeWindowHours: "72", lateFee1Minutes: "15", lateFee1Amount: "100", lateFee2Minutes: "20", lateFee2Amount: "150", lateCancelMinutes: "25" });
  });

  it("turns the form back into the settings to save", () => {
    expect(fromForm(form)).toEqual({ downpayment_amount: 500, payment_methods: ["QRPH", "MANUAL"], birthday_discount_pct: 20, loyalty_stamps_required: 8, booking_hold_minutes: 5, booking_min_notice_hours: 2, booking_max_advance_days: 30, booking_reminders_enabled: true, rebook_nudge_days: 0, ...POLICY });
  });

  it("treats the same ways to pay in another order as unchanged", () => {
    expect(sameForm(form, { ...form, methods: ["MANUAL", "QRPH"] })).toBe(true);
    expect(sameForm(form, { ...form, birthdayPct: "25" })).toBe(false);
    expect(sameForm(form, { ...form, holdMinutes: "10" })).toBe(false);
    expect(sameForm(form, { ...form, noticeHours: "4" })).toBe(false);
    expect(sameForm(form, { ...form, advanceDays: "60" })).toBe(false);
    expect(sameForm(form, { ...form, rebookDays: "14" })).toBe(false);
    expect(sameForm(form, { ...form, reminders: false })).toBe(false);
  });

  it("checks the policy numbers on their own tab", () => {
    expect(settingsProblemIn({ ...form, changeWindowHours: "0" })?.tab).toBe("policies");
    expect(settingsProblemIn({ ...form, lateFee2Minutes: "15" })?.message).toMatch(/second late fee must start later/);
    expect(settingsProblemIn({ ...form, lateCancelMinutes: "20" })?.message).toMatch(/Cancelling for lateness/);
    expect(settingsProblemIn({ ...form, lateFee2Amount: "50" })?.message).toMatch(/can't be lower/);
    expect(sameForm(form, { ...form, changeWindowHours: "48" })).toBe(false);
    expect(fromForm({ ...form, changeWindowHours: "48" }).change_window_hours).toBe(48);
  });

  it("says which tab a problem is on, so the page can show it", () => {
    expect(settingsProblemIn({ ...form, downpayment: "0" })?.tab).toBe("payments");
    expect(settingsProblemIn({ ...form, methods: [] })?.tab).toBe("payments");
    expect(settingsProblemIn({ ...form, holdMinutes: "99" })?.tab).toBe("booking");
    expect(settingsProblemIn({ ...form, rebookDays: "3" })?.tab).toBe("booking");
    expect(settingsProblemIn({ ...form, birthdayPct: "0" })?.tab).toBe("rewards");
    expect(settingsProblemIn({ ...form, stampsRequired: "99" })?.tab).toBe("rewards");
    expect(settingsProblemIn(form)).toBeNull();
  });

  it("refuses a downpayment, ways to pay or discount the server would refuse", () => {
    expect(settingsProblem(form)).toBeNull();
    expect(settingsProblem({ ...form, downpayment: "0" })).toMatch(/downpayment/);
    expect(settingsProblem({ ...form, downpayment: "12.5" })).toMatch(/downpayment/);
    expect(settingsProblem({ ...form, downpayment: "100001" })).toMatch(/downpayment/);
    expect(settingsProblem({ ...form, methods: [] })).toMatch(/QR Ph/);
    expect(settingsProblem({ ...form, methods: ["MANUAL"] })).toMatch(/QR Ph/);
    expect(settingsProblem({ ...form, birthdayPct: "101" })).toMatch(/birthday/);
    expect(settingsProblem({ ...form, birthdayPct: "" })).toMatch(/birthday/);
    expect(settingsProblem({ ...form, stampsRequired: "0" })).toMatch(/stamps/);
    expect(settingsProblem({ ...form, stampsRequired: "21" })).toMatch(/stamps/);
    expect(settingsProblem({ ...form, holdMinutes: "0" })).toMatch(/hold/);
    expect(settingsProblem({ ...form, holdMinutes: "61" })).toMatch(/hold/);
    expect(settingsProblem({ ...form, holdMinutes: "2.5" })).toMatch(/hold/);
  });

  it("lets the rebooking email be off (0) or 7 to 60 days, and refuses anything else the server would", () => {
    expect(settingsProblem({ ...form, rebookDays: "0" })).toBeNull();
    expect(settingsProblem({ ...form, rebookDays: "7" })).toBeNull();
    expect(settingsProblem({ ...form, rebookDays: "60" })).toBeNull();
    expect(settingsProblem({ ...form, rebookDays: "3" })).toMatch(/rebooking/);
    expect(settingsProblem({ ...form, rebookDays: "61" })).toMatch(/rebooking/);
    expect(settingsProblem({ ...form, rebookDays: "10.5" })).toMatch(/rebooking/);
    expect(settingsProblem({ ...form, rebookDays: "" })).toMatch(/rebooking/);
  });

  it("keeps how far ahead clients can book within what the server accepts", () => {
    expect(settingsProblem({ ...form, advanceDays: "7" })).toBeNull();
    expect(settingsProblem({ ...form, advanceDays: "365" })).toBeNull();
    expect(settingsProblem({ ...form, advanceDays: "6" })).toMatch(/ahead/);
    expect(settingsProblem({ ...form, advanceDays: "366" })).toMatch(/ahead/);
    expect(settingsProblem({ ...form, advanceDays: "30.5" })).toMatch(/ahead/);
    expect(settingsProblem({ ...form, advanceDays: "" })).toMatch(/ahead/);
  });

  it("allows no notice (0 hours), and refuses one the server would refuse", () => {
    expect(settingsProblem({ ...form, noticeHours: "0" })).toBeNull();
    expect(settingsProblem({ ...form, noticeHours: "72" })).toBeNull();
    expect(settingsProblem({ ...form, noticeHours: "73" })).toMatch(/notice/);
    expect(settingsProblem({ ...form, noticeHours: "-1" })).toMatch(/notice/);
    expect(settingsProblem({ ...form, noticeHours: "1.5" })).toMatch(/notice/);
    expect(settingsProblem({ ...form, noticeHours: "" })).toMatch(/notice/);
  });
});
