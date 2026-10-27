import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PerformanceView from "@/components/features/admin/dashboard/PerformanceView";
import { dashboardData as data } from "./dashboardFixture";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

describe("PerformanceView", () => {
  it("shows the key rates, then the weekday and artist charts", () => {
    render(<PerformanceView data={data} />);
    const rates = screen.getByRole("region", { name: "Key rates" });
    const weekdays = screen.getByRole("region", { name: "Busiest weekdays" });
    expect(rates.compareDocumentPosition(weekdays) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Visits done" })).toBeNull();
    expect(screen.getByRole("region", { name: "Bookings per artist" })).toBeInTheDocument();
  });

  it("no longer shows the money, the visit counts, average sale, client lifetime value, churn or loyalty", () => {
    render(<PerformanceView data={data} />);
    for (const name of ["Collected", "Sales", "Bookings", "Returning clients", "Average sale", "Client lifetime value", "Churn", "Loyalty"]) expect(screen.queryByRole("group", { name })).toBeNull();
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
