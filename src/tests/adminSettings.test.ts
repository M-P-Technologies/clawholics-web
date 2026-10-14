import { describe, expect, it } from "vitest";
import { fromForm, sameForm, settingsProblem, toForm } from "@/lib/admin/settings";

describe("admin settings form", () => {
  const form = toForm({ downpayment_amount: 500, payment_methods: ["GCASH", "MANUAL", "QRPH"], birthday_discount_pct: 20, loyalty_stamps_required: 8 });

  it("keeps only the ways to pay the site has screens for", () => {
    expect(form).toEqual({ downpayment: "500", methods: ["QRPH", "MANUAL"], birthdayPct: "20", stampsRequired: "8" });
  });

  it("turns the form back into the settings to save", () => {
    expect(fromForm(form)).toEqual({ downpayment_amount: 500, payment_methods: ["QRPH", "MANUAL"], birthday_discount_pct: 20, loyalty_stamps_required: 8 });
  });

  it("treats the same ways to pay in another order as unchanged", () => {
    expect(sameForm(form, { ...form, methods: ["MANUAL", "QRPH"] })).toBe(true);
    expect(sameForm(form, { ...form, birthdayPct: "25" })).toBe(false);
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
  });
});
