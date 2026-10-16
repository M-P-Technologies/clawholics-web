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
