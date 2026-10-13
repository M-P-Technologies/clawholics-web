import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MoneyCards from "@/components/admin/dashboard/MoneyCards";
import type { Money } from "@/services/dashboardTypes";

const money: Money = {
  balanceAtSalon: { value: 1300, previous: 700 },
  returningRevenue: { value: 300, previous: 0 },
  lostToCancellations: { value: 2000, previous: 0 },
  bookedAhead: { value: 2300, visits: 3, days: [{ date: "2026-10-14", value: 2000, visits: 1 }, { date: "2026-10-15", value: 0, visits: 1 }, { date: "2026-10-16", value: 300, visits: 1 }] },
};

describe("MoneyCards", () => {
  it("shows the balance collected at the salon, with its change", () => {
    render(<MoneyCards money={money} />);
    const card = within(screen.getByRole("group", { name: "Balance at the salon" }));
    expect(card.getByText("₱1,300")).toBeInTheDocument();
    expect(card.getByText("+86%")).toBeInTheDocument();
    expect(card.getByText("estimated: list price minus downpayments")).toBeInTheDocument();
  });

  it("shows what confirmed upcoming visits are worth", () => {
    render(<MoneyCards money={money} />);
    const card = within(screen.getByRole("group", { name: "Booked ahead" }));
    expect(card.getByText("₱2,300")).toBeInTheDocument();
    expect(card.getByText("3 confirmed visits from today")).toBeInTheDocument();
  });

  it("shows what cancellations cost, with one visit in the singular", () => {
    render(<MoneyCards money={{ ...money, bookedAhead: { value: 800, visits: 1, days: [] } }} />);
    expect(within(screen.getByRole("group", { name: "Lost to cancellations" })).getByText("₱2,000")).toBeInTheDocument();
    expect(screen.getByText("1 confirmed visit from today")).toBeInTheDocument();
  });

  it("shows revenue from returning clients and its share of all revenue", () => {
    render(<MoneyCards money={money} revenue={1200} />);
    const card = within(screen.getByRole("group", { name: "From returning clients" }));
    expect(card.getByText("₱300")).toBeInTheDocument();
    expect(card.getByText("new")).toBeInTheDocument();
    expect(card.getByText("25% of estimated sales, from clients who visited before")).toBeInTheDocument();
  });

  it("leaves the share out when there were no sales", () => {
    render(<MoneyCards money={{ ...money, returningRevenue: { value: 0, previous: 0 } }} revenue={0} />);
    expect(within(screen.getByRole("group", { name: "From returning clients" })).getByText("from clients who visited before")).toBeInTheDocument();
  });

  it("sits in one row named Money", () => {
    render(<MoneyCards money={money} />);
    expect(within(screen.getByRole("region", { name: "Money" })).getAllByRole("group")).toHaveLength(4);
  });
});

describe("MoneyCards: the lines", () => {
  const trend = {
    granularity: "day" as const,
    points: [
      { date: "2026-10-12", collected: 0, estimatedSales: 0, bookings: 0, newClients: 0, balanceAtSalon: 0, returningRevenue: 0, lost: 500 },
      { date: "2026-10-13", collected: 0, estimatedSales: 0, bookings: 0, newClients: 0, balanceAtSalon: 300, returningRevenue: 800, lost: 0 },
    ],
  };

  it("draws a small line on each of the four cards, described in words", () => {
    render(<MoneyCards money={money} trend={trend} />);
    expect(screen.getByRole("img", { name: "Balance at the salon per day, from ₱0 to ₱300" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "From returning clients per day, from ₱0 to ₱800" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Lost to cancellations per day, from ₱500 to ₱0" })).toBeInTheDocument();
    // Booked ahead looks forward: one point per day from today
    const ahead = screen.getByRole("img", { name: "Booked ahead per day for the next 3 days, from ₱2,000 to ₱300" });
    expect([...ahead.querySelectorAll("title")].map((t) => t.textContent)).toEqual(["Oct 14: ₱2,000", "Oct 15: ₱0", "Oct 16: ₱300"]);
  });

  it("draws no lines without points", () => {
    render(<MoneyCards money={{ ...money, bookedAhead: { ...money.bookedAhead, days: [] } }} trend={{ granularity: "day", points: [] }} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});

