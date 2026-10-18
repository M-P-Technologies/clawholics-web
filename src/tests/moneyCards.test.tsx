import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MoneyCards from "@/components/features/admin/dashboard/MoneyCards";
import type { Money } from "@/services/dashboardTypes";

const money: Money = {
  grossReceipts: { value: 1300, previous: 700 },
  unearned: { value: 600, previous: 0 },
  revenue: { value: 2000, previous: 1600 },
  otherIncome: { value: 400, previous: 400 },
  refunds: { value: 300, previous: 0 },
  points: [
    { date: "2026-10-12", grossReceipts: 0, unearned: 300, revenue: 900, otherIncome: 400, refunds: 300 },
    { date: "2026-10-13", grossReceipts: 1300, unearned: 600, revenue: 1100, otherIncome: 0, refunds: 0 },
  ],
};

describe("MoneyCards", () => {
  it("shows the gross income, with their change", () => {
    render(<MoneyCards money={money} />);
    const card = within(screen.getByRole("group", { name: "Gross income" }));
    expect(card.getByText("₱1,300")).toBeInTheDocument();
    expect(card.getByText("+86%")).toBeInTheDocument();
    expect(card.getByText("payments in, less refunds")).toBeInTheDocument();
  });

  it("shows the downpayments held for visits not done yet", () => {
    render(<MoneyCards money={money} />);
    const card = within(screen.getByRole("group", { name: "Unearned income" }));
    expect(card.getByText("₱600")).toBeInTheDocument();
    expect(card.getByText("new")).toBeInTheDocument();
    expect(card.getByText("held today for upcoming visits")).toBeInTheDocument();
  });

  it("shows the forfeits and late fees, and the revenue in place of the refunds", () => {
    render(<MoneyCards money={money} />);
    expect(within(screen.getByRole("group", { name: "Forfeits & late fees" })).getByText("₱400")).toBeInTheDocument();
    const revenue = within(screen.getByRole("group", { name: "Revenue" }));
    expect(revenue.getByText("₱2,000")).toBeInTheDocument();
    expect(revenue.getByText("+25%")).toBeInTheDocument();
    expect(revenue.getByText("earned from visits done")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Refunds" })).toBeNull();
  });

  it("sits in one row named Money, Revenue first", () => {
    render(<MoneyCards money={money} />);
    const cards = within(screen.getByRole("region", { name: "Money" })).getAllByRole("group");
    expect(cards.map((c) => c.getAttribute("aria-label"))).toEqual(["Revenue", "Gross income", "Unearned income", "Forfeits & late fees"]);
  });
});

describe("MoneyCards: the lines", () => {
  it("draws a small line on each of the four cards, described in words", () => {
    render(<MoneyCards money={money} granularity="day" />);
    expect(screen.getByRole("img", { name: "Gross income per day, from ₱0 to ₱1,300" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Unearned income per day, from ₱300 to ₱600" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Forfeits and late fees per day, from ₱400 to ₱0" })).toBeInTheDocument();
    const revenue = screen.getByRole("img", { name: "Revenue per day, from ₱900 to ₱1,100" });
    expect([...revenue.querySelectorAll("title")].map((t) => t.textContent)).toEqual(["Oct 12: ₱900", "Oct 13: ₱1,100"]);
  });

  it("speaks of weeks when the points are weekly", () => {
    render(<MoneyCards money={money} granularity="week" />);
    expect(screen.getByRole("img", { name: "Gross income per week, from ₱0 to ₱1,300" })).toBeInTheDocument();
  });

  it("draws no lines without points", () => {
    render(<MoneyCards money={{ ...money, points: [] }} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
