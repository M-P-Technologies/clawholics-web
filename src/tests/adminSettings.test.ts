import { describe, expect, it } from "vitest";
import { fromForm, sameForm, settingsProblem, toForm } from "@/lib/admin/settings";

describe("admin settings form", () => {
  const form = toForm({ downpayment_amount: 500, payment_methods: ["GCASH", "MANUAL", "QRPH"], birthday_discount_pct: 20, loyalty_stamps_required: 8, booking_hold_minutes: 5, booking_min_notice_hours: 2, booking_reminders_enabled: true });

  it("keeps only the ways to pay the site has screens for", () => {
    expect(form).toEqual({ downpayment: "500", methods: ["QRPH", "MANUAL"], birthdayPct: "20", stampsRequired: "8", holdMinutes: "5", noticeHours: "2", reminders: true });
  });

  it("turns the form back into the settings to save", () => {
    expect(fromForm(form)).toEqual({ downpayment_amount: 500, payment_methods: ["QRPH", "MANUAL"], birthday_discount_pct: 20, loyalty_stamps_required: 8, booking_hold_minutes: 5, booking_min_notice_hours: 2, booking_reminders_enabled: true });
  });

  it("treats the same ways to pay in another order as unchanged", () => {
    expect(sameForm(form, { ...form, methods: ["MANUAL", "QRPH"] })).toBe(true);
    expect(sameForm(form, { ...form, birthdayPct: "25" })).toBe(false);
    expect(sameForm(form, { ...form, holdMinutes: "10" })).toBe(false);
    expect(sameForm(form, { ...form, noticeHours: "4" })).toBe(false);
    expect(sameForm(form, { ...form, reminders: false })).toBe(false);
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

  it("allows no notice (0 hours), and refuses one the server would refuse", () => {
    expect(settingsProblem({ ...form, noticeHours: "0" })).toBeNull();
    expect(settingsProblem({ ...form, noticeHours: "72" })).toBeNull();
    expect(settingsProblem({ ...form, noticeHours: "73" })).toMatch(/notice/);
    expect(settingsProblem({ ...form, noticeHours: "-1" })).toMatch(/notice/);
    expect(settingsProblem({ ...form, noticeHours: "1.5" })).toMatch(/notice/);
    expect(settingsProblem({ ...form, noticeHours: "" })).toMatch(/notice/);
  });
});
