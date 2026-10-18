import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MoneyCards from "@/components/features/admin/dashboard/MoneyCards";
import type { Money } from "@/services/dashboardTypes";

const money: Money = {
  grossReceipts: { value: 1300, previous: 700 },
  unearned: { value: 600, previous: 0 },
  otherIncome: { value: 400, previous: 400 },
  refunds: { value: 300, previous: 0 },
  points: [
    { date: "2026-10-12", grossReceipts: 0, unearned: 300, otherIncome: 400, refunds: 300 },
    { date: "2026-10-13", grossReceipts: 1300, unearned: 600, otherIncome: 0, refunds: 0 },
  ],
};

describe("MoneyCards", () => {
  it("shows the gross receipts, with their change", () => {
    render(<MoneyCards money={money} />);
    const card = within(screen.getByRole("group", { name: "Gross receipts" }));
    expect(card.getByText("₱1,300")).toBeInTheDocument();
    expect(card.getByText("+86%")).toBeInTheDocument();
    expect(card.getByText("payments in, less refunds")).toBeInTheDocument();
  });

  it("shows the downpayments held for visits not done yet", () => {
    render(<MoneyCards money={money} />);
    const card = within(screen.getByRole("group", { name: "Unearned" }));
    expect(card.getByText("₱600")).toBeInTheDocument();
    expect(card.getByText("new")).toBeInTheDocument();
    expect(card.getByText("held today for upcoming visits")).toBeInTheDocument();
  });

  it("shows the forfeits and late fees, and the refunds", () => {
    render(<MoneyCards money={money} />);
    expect(within(screen.getByRole("group", { name: "Forfeits & late fees" })).getByText("₱400")).toBeInTheDocument();
    const refunds = within(screen.getByRole("group", { name: "Refunds" }));
    expect(refunds.getByText("₱300")).toBeInTheDocument();
    expect(refunds.getByText("downpayments returned")).toBeInTheDocument();
  });

  it("sits in one row named Money", () => {
    render(<MoneyCards money={money} />);
    expect(within(screen.getByRole("region", { name: "Money" })).getAllByRole("group")).toHaveLength(4);
  });
});

describe("MoneyCards: the lines", () => {
  it("draws a small line on each of the four cards, described in words", () => {
    render(<MoneyCards money={money} granularity="day" />);
    expect(screen.getByRole("img", { name: "Gross receipts per day, from ₱0 to ₱1,300" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Unearned per day, from ₱300 to ₱600" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Forfeits and late fees per day, from ₱400 to ₱0" })).toBeInTheDocument();
    const refunds = screen.getByRole("img", { name: "Refunds per day, from ₱300 to ₱0" });
    expect([...refunds.querySelectorAll("title")].map((t) => t.textContent)).toEqual(["Oct 12: ₱300", "Oct 13: ₱0"]);
  });

  it("speaks of weeks when the points are weekly", () => {
    render(<MoneyCards money={money} granularity="week" />);
    expect(screen.getByRole("img", { name: "Gross receipts per week, from ₱0 to ₱1,300" })).toBeInTheDocument();
  });

  it("draws no lines without points", () => {
    render(<MoneyCards money={{ ...money, points: [] }} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
