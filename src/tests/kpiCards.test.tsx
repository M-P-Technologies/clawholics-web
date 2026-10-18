import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import KpiCards from "@/components/features/admin/dashboard/KpiCards";
import { dashboardData } from "./dashboardFixture";

const { kpis, trend } = dashboardData;
const NAMES = ["Collected", "Sales", "Bookings", "Returning clients"];

// The visits done, on the Performance page
describe("KpiCards", () => {
  it("shows the four numbers with how they moved, two across and four from xl", () => {
    render(<KpiCards kpis={kpis} trend={trend} />);
    const row = screen.getByRole("region", { name: "Visits done" });
    expect(row.className).toContain("grid-cols-2");
    expect(row.className).toContain("xl:grid-cols-4");
    expect(within(row).getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual(NAMES);
    const collected = within(screen.getByRole("group", { name: "Collected" }));
    expect(collected.getByText("₱2,000")).toBeInTheDocument();
    expect(collected.getByText("+100%")).toBeInTheDocument();
    for (const name of NAMES) expect(within(screen.getByRole("group", { name })).getByTestId("kpi-icon")).toBeInTheDocument();
  });

  it("says what Sales adds up: the downpayments and balances of completed visits", () => {
    render(<KpiCards kpis={kpis} trend={trend} />);
    expect(within(screen.getByRole("group", { name: "Sales" })).getByText("downpayment + balance")).toBeInTheDocument();
  });

  it("draws a small line on each card, described in words, each point named", () => {
    render(<KpiCards kpis={kpis} trend={trend} />);
    expect(screen.getByRole("img", { name: "Sales per day, from ₱0 to ₱800" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Bookings per day, from 1 to 2" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Returning clients per day, from 3 to 4" })).toBeInTheDocument();
    const line = screen.getByRole("img", { name: "Collected per day, from ₱0 to ₱500" });
    expect([...line.querySelectorAll("title")].map((t) => t.textContent)).toEqual(["Oct 12: ₱0", "Oct 13: ₱300", "Oct 14: ₱500"]);
  });

  it("speaks of months when the line has monthly points, and draws none without points", () => {
    const monthly = { granularity: "month" as const, points: [{ date: "2026-09-01", collected: 100, estimatedSales: 0, bookings: 0, newClients: 0, recurringClients: 0 }, { date: "2026-10-01", collected: 400, estimatedSales: 0, bookings: 0, newClients: 0, recurringClients: 0 }] };
    const { unmount } = render(<KpiCards kpis={kpis} trend={monthly} />);
    expect(screen.getByRole("img", { name: "Collected per month, from ₱100 to ₱400" })).toBeInTheDocument();
    unmount();
    render(<KpiCards kpis={kpis} trend={{ granularity: "day", points: [] }} />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
