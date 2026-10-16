import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Performance from "@/app/(admin)/performance/page";
import Sales from "@/app/(admin)/sales/page";
import { dashboardData } from "./dashboardFixture";

const fetchDashboard = vi.fn();
const fetchUtilization = vi.fn(async () => ({ week: { from: "2026-10-12", to: "2026-10-18" }, overall: null, artists: [] }));
vi.mock("@/services/dashboardService", () => ({
  fetchDashboard: (...args: unknown[]) => fetchDashboard(...args),
  fetchUtilization: (...args: unknown[]) => fetchUtilization(...(args as [])),
}));
vi.mock("@/components/features/admin/shell/SideBar", () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
  useLocation: () => ({ pathname: "/sales" }),
}));
vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok", isLoaded: true };
  const user = { user: { id: "admin_1" } };
  return { useAuth: () => auth, useUser: () => user };
});

beforeEach(() => {
  fetchDashboard.mockReset().mockResolvedValue(dashboardData);
  fetchUtilization.mockClear();
});

describe("the Sales page", () => {
  it("loads the period's numbers and shows the money, what sold and the sales record", async () => {
    render(<Sales />);
    expect(await screen.findByRole("region", { name: "Money" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sales" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Sales record" })).toBeInTheDocument();
    expect(fetchDashboard).toHaveBeenCalledWith("month", "tok", "admin_1");
  });

  it("asks again when the period changes", async () => {
    render(<Sales />);
    await screen.findByRole("region", { name: "Money" });
    fireEvent.click(screen.getAllByRole("tab", { name: "This week" })[0]);
    await waitFor(() => expect(fetchDashboard).toHaveBeenLastCalledWith("week", "tok", "admin_1"));
  });

  it("offers a retry when the numbers can't be loaded", async () => {
    fetchDashboard.mockRejectedValueOnce(new Error("boom"));
    render(<Sales />);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Money" })).toBeInTheDocument();
  });
});

describe("the Performance page", () => {
  it("shows the key rates and loads artist utilization", async () => {
    render(<Performance />);
    const rates = await screen.findByRole("region", { name: "Key rates" });
    expect(within(rates).getByRole("group", { name: "Churn" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Performance" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Artist utilization" })).toBeInTheDocument();
    expect(fetchUtilization).toHaveBeenCalled();
  });
});
