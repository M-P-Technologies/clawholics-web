import { describe, expect, it } from "vitest";
import { depositTerms } from "@/lib/depositTerms";

describe("depositTerms", () => {
  it("splits the downpayment into the reservation fee and what comes off the bill", () => {
    expect(depositTerms(500)).toEqual({ total: 500, fee: 100, deductible: 400 });
    expect(depositTerms(1000)).toEqual({ total: 1000, fee: 100, deductible: 900 });
  });

  it("never makes the fee more than the downpayment, or the deductible negative", () => {
    expect(depositTerms(100)).toEqual({ total: 100, fee: 100, deductible: 0 });
    expect(depositTerms(60)).toEqual({ total: 60, fee: 60, deductible: 0 });
    expect(depositTerms(0)).toEqual({ total: 0, fee: 0, deductible: 0 });
  });

  it("rounds to whole pesos", () => {
    expect(depositTerms(499.6).total).toBe(500);
  });
});
