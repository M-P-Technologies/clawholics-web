import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY, hoursLabel, policyProblem, readPolicy } from "@/lib/policy";
import { lateFee } from "@/lib/visitCompletion";
import { cancelOutcome, refundWindowOpen } from "@/lib/admin/cancelBooking";

describe("the salon's policy numbers", () => {
  it("are what the terms always said until they are changed", () => {
    expect(DEFAULT_POLICY).toEqual({ change_window_hours: 72, late_fee_1_minutes: 15, late_fee_1_amount: 100, late_fee_2_minutes: 20, late_fee_2_amount: 150, late_cancel_minutes: 25 });
    expect(policyProblem(DEFAULT_POLICY)).toBeNull();
  });

  it("read what was saved, and the default for anything missing", () => {
    expect(readPolicy(null)).toEqual(DEFAULT_POLICY);
    expect(readPolicy({ change_window_hours: "48", late_fee_1_amount: 200, late_fee_2_amount: "300" })).toEqual({ ...DEFAULT_POLICY, change_window_hours: 48, late_fee_1_amount: 200, late_fee_2_amount: 300 });
  });

  it("fall back to the defaults altogether when what was saved doesn't hold together", () => {
    expect(readPolicy({ late_fee_1_minutes: "30" })).toEqual(DEFAULT_POLICY);
    expect(readPolicy({ change_window_hours: "abc" })).toEqual(DEFAULT_POLICY);
  });

  it("are refused when they can't be right", () => {
    expect(policyProblem({ ...DEFAULT_POLICY, change_window_hours: 0 })).toMatch(/change window/);
    expect(policyProblem({ ...DEFAULT_POLICY, change_window_hours: 400 })).toMatch(/change window/);
    expect(policyProblem({ ...DEFAULT_POLICY, late_fee_1_amount: -1 })).toMatch(/late fee/i);
    expect(policyProblem({ ...DEFAULT_POLICY, late_fee_2_minutes: 15 })).toMatch(/second late fee must start later/);
    expect(policyProblem({ ...DEFAULT_POLICY, late_cancel_minutes: 20 })).toMatch(/Cancelling for lateness/);
    expect(policyProblem({ ...DEFAULT_POLICY, late_fee_2_amount: 50 })).toMatch(/can't be lower/);
  });

  it("are written as hours, or as days from two", () => {
    expect([hoursLabel(1), hoursLabel(24), hoursLabel(48), hoursLabel(72), hoursLabel(36)]).toEqual(["1 hour", "24 hours", "2 days", "3 days", "36 hours"]);
  });

  it("set the late fees and when the visit is cancelled", () => {
    expect(lateFee(14)).toEqual({ fee: 0, cancel: false });
    expect(lateFee(15)).toEqual({ fee: 100, cancel: false });
    expect(lateFee(20)).toEqual({ fee: 150, cancel: false });
    expect(lateFee(25)).toEqual({ fee: 150, cancel: true });
    const custom = { ...DEFAULT_POLICY, late_fee_1_minutes: 10, late_fee_1_amount: 50, late_fee_2_minutes: 30, late_fee_2_amount: 200, late_cancel_minutes: 45 };
    expect([lateFee(9, custom), lateFee(10, custom), lateFee(30, custom), lateFee(45, custom)]).toEqual([
      { fee: 0, cancel: false }, { fee: 50, cancel: false }, { fee: 200, cancel: false }, { fee: 200, cancel: true },
    ]);
    expect(lateFee(null, custom)).toEqual({ fee: 0, cancel: false });
  });

  it("set how close to a visit a downpayment is still refunded", () => {
    // The visit is 2026-11-20 at 10:00 in Manila; "now" is 60 hours before it
    const now = Date.UTC(2026, 10, 20, 10 - 8, 0) - 60 * 3600_000;
    expect(refundWindowOpen("2026-11-20", "10:00-12:00", now)).toBe(false); // 72 hours by default
    expect(refundWindowOpen("2026-11-20", "10:00-12:00", now, 48)).toBe(true);
    const paid = { appointment_date: "2026-11-20", appointment_time: "10:00-12:00", paid_downpayment: 500, payment_status: "PAID" };
    expect(cancelOutcome(paid, now)).toBe("keep");
    expect(cancelOutcome(paid, now, 48)).toBe("refund");
  });
});
