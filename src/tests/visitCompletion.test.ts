import { describe, expect, it } from "vitest";
import { BALANCE_METHODS, RESERVATION_FEE, expectedBalance } from "@/lib/visitCompletion";

describe("the balance expected at the salon", () => {
  it("is the menu price less the downpayment, without the ₱100 reservation fee", () => {
    expect(RESERVATION_FEE).toBe(100);
    expect(expectedBalance(1500, 500)).toBe(1100);
  });

  it("expected balance without a downpayment is the menu price", () => {
    expect(expectedBalance(1500, 0)).toBe(1500);
  });

  it("is never below zero, and zero for a service with no price", () => {
    expect(expectedBalance(300, 500)).toBe(0);
    expect(expectedBalance(null, 500)).toBe(0);
  });

  it("offers the six ways to pay", () => {
    expect(BALANCE_METHODS).toEqual(["Cash", "GCash", "Maya", "Bank transfer", "Card", "Other"]);
  });
});

describe("late arrivals, by the salon's terms", () => {
  it("counts the minutes after the booked start, and none when early or on time", async () => {
    const { minutesLate } = await import("@/lib/visitCompletion");
    expect(minutesLate("13:00-15:00", "13:17")).toBe(17);
    expect(minutesLate("9:30-11:00", "09:55")).toBe(25);
    expect(minutesLate("13:00-15:00", "12:50")).toBe(0);
    expect(minutesLate("13:00-15:00", "")).toBeNull();
    expect(minutesLate("13:00-15:00", "1pm")).toBeNull();
  });

  it("charges ₱100 from 15 minutes, ₱150 from 20, and from 25 the visit is cancelled", async () => {
    const { lateFee } = await import("@/lib/visitCompletion");
    expect(lateFee(null)).toEqual({ fee: 0, cancel: false });
    expect(lateFee(14)).toEqual({ fee: 0, cancel: false });
    expect(lateFee(15)).toEqual({ fee: 100, cancel: false });
    expect(lateFee(19)).toEqual({ fee: 100, cancel: false });
    expect(lateFee(20)).toEqual({ fee: 150, cancel: false });
    expect(lateFee(24)).toEqual({ fee: 150, cancel: false });
    expect(lateFee(25)).toEqual({ fee: 150, cancel: true });
  });
});
