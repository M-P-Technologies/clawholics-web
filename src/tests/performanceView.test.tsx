import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PerformanceView from "@/features/dashboard/components/PerformanceView";
import { dashboardData as data } from "./dashboardFixture";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

describe("PerformanceView", () => {
  it("shows the salon at a glance, the key rates, then the weekday and artist charts", () => {
    render(<PerformanceView data={data} />);
    const glance = screen.getByRole("region", { name: "Salon at a glance" });
    const rates = screen.getByRole("region", { name: "Key rates" });
    const weekdays = screen.getByRole("region", { name: "Busiest weekdays" });
    expect(glance.compareDocumentPosition(rates) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(rates.compareDocumentPosition(weekdays) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("region", { name: "Bookings per artist" })).toBeInTheDocument();
  });

  it("lays the eight key rates out four across from sm up, two on a phone, with no icons", () => {
    render(<PerformanceView data={data} />);
    const rates = screen.getByRole("region", { name: "Key rates" });
    expect(rates).toHaveClass("grid-cols-2", "sm:grid-cols-4");
    expect(within(rates).getAllByRole("group")).toHaveLength(8);
    expect(within(rates).queryByTestId("kpi-icon")).toBeNull();
  });

  it("shows lead conversion with its counts", () => {
    render(<PerformanceView data={data} />);
    const tile = within(screen.getByRole("group", { name: "Lead conversion" }));
    expect(tile.getByText("50%")).toBeInTheDocument();
    expect(tile.getByText("2 of 4 new accounts booked")).toBeInTheDocument();
  });

  it("shows client lifetime value and churn", () => {
    render(<PerformanceView data={data} />);
    expect(within(screen.getByRole("group", { name: "Client lifetime value" })).getByText("₱1,120")).toBeInTheDocument();
    const churn = within(screen.getByRole("group", { name: "Churn" }));
    expect(churn.getByText("40%")).toBeInTheDocument();
    expect(churn.getByText("2 of 5 clients, no visit in 60 days")).toBeInTheDocument();
  });

  it("shows artist utilization after the key rates when the screen can load it", async () => {
    const load = async () => ({ week: { from: "2026-10-12", to: "2026-10-18" }, overall: null, artists: [] });
    render(<PerformanceView data={data} loadUtilization={load} />);
    const card = await screen.findByRole("region", { name: "Artist utilization" });
    const rates = screen.getByRole("region", { name: "Key rates" });
    expect(rates.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("leaves artist utilization out without a loader (e.g. a preview)", () => {
    render(<PerformanceView data={data} />);
    expect(screen.queryByRole("region", { name: "Artist utilization" })).toBeNull();
  });
});
