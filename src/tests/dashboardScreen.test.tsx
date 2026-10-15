import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "@/app/(admin)/dashboard/page";
import type { DashboardResponse } from "@/services/dashboardTypes";

const fetchDashboard = vi.fn();
vi.mock("@/services/dashboardService", () => ({
  fetchDashboard: (...args: unknown[]) => fetchDashboard(...args),
  fetchUtilization: async () => ({ week: { from: "2026-10-12", to: "2026-10-18" }, overall: null, artists: [] }),
}));
vi.mock("@/services/appointmentService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/appointmentService")>()),
  fetchAppointments: (...args: unknown[]) => fetchAppointments(...args),
}));
// The bookings table: Dana's upcoming visit (far ahead, so it is upcoming whatever today is)
const fetchAppointments = vi.fn(async (..._args: unknown[]) => [
  { id: 8, user_id: 4, service_name: "Gel Manicure", nailist_name: "Maxine", appointment_date: "2099-01-05", appointment_time: "15:00-16:00", status: "CONFIRMED", first_name: "Dana", last_name: "D" },
]);
vi.mock("@/components/features/admin/shell/SideBar", () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
  useLocation: () => ({ pathname: "/dashboard" }),
}));
// A stable getToken, as the real Clerk hook has
vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok" };
  const user = { user: { id: "admin_1" } };
  return { useAuth: () => auth, useUser: () => user };
});

const base = (over: Partial<DashboardResponse> = {}): DashboardResponse => ({
  range: "month",
  period: { from: "2026-10-01", to: "2026-10-31" },
  previous: { from: "2026-09-01", to: "2026-09-30" },
  kpis: {
    collected: { value: 2000, previous: 1000 },
    estimatedSales: { value: 3100, previous: 1700 },
    bookings: { value: 7, previous: 0 },
    newClients: { value: 2, previous: 2 },
  },
  rates: {
    cancellation: { value: 2 / 9, previous: 0 },
    conversion: { value: null, previous: null },
    returning: { value: 1 / 3, previous: 0 },
    averageSale: { value: 775, previous: 567 }, leadConversion: { value: 0.5, previous: 0.5 },
  },
  lapsedClients: 1, leads: { accounts: 4, booked: 2 }, clientBase: { clients: 5, lifetimeValue: 1120, churn: 0.2 }, totals: { clients: 17, services: 35, artists: 5, upcoming: 7, trend: [] }, sales: [],
  loyalty: { stamps: 3, redeemed: 1 },
  attention: { today: 2, proofsToReview: 2, unpaid: 2, warmLeads: 0 },
  money: { balanceAtSalon: { value: 0, previous: 0 }, returningRevenue: { value: 0, previous: 0 }, lostToCancellations: { value: 0, previous: 0 }, bookedAhead: { value: 0, visits: 0, days: [] } },
  trend: { granularity: "day", points: [] },
  monthly: [
    { month: "2026-05", completed: 0, cancelled: 0 }, { month: "2026-06", completed: 1, cancelled: 0 },
    { month: "2026-07", completed: 0, cancelled: 0 }, { month: "2026-08", completed: 0, cancelled: 0 },
    { month: "2026-09", completed: 3, cancelled: 0 }, { month: "2026-10", completed: 4, cancelled: 2 },
  ],
  services: [{ name: "Gel Manicure", bookings: 3, estimatedSales: 1300 }, { name: "Nail Art", bookings: 2, estimatedSales: 300 }],
  weekdays: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: weekday === 3 ? 2 : 0 })),
  artists: [{ name: "Jun", bookings: 4 }],
  outcomes: { confirmed: 3, completed: 4, pending: 2, cancelled: 1, refunded: 1 },
  next: [{ id: 1, client_name: "Dana D", service_name: "Gel Manicure", nailist_name: "Maxine", appointment_date: "2026-10-14", appointment_time: "15:00-16:00" }],
  ...over,
});

beforeEach(() => fetchDashboard.mockReset());

describe("Dashboard", () => {
  it("shows the headline numbers with how they moved", async () => {
    fetchDashboard.mockResolvedValue(base());
    render(<Dashboard />);
    const collected = await screen.findByRole("group", { name: "Collected" });
    expect(within(collected).getByText("₱2,000")).toBeInTheDocument();
    expect(within(collected).getByText("+100%")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Estimated sales" })).getByText("₱3,100")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Bookings" })).getByText("new")).toBeInTheDocument(); // previous was 0
    expect(await screen.findByText("Dana D")).toBeInTheDocument();
    // the written summary of the period sits above the numbers
    expect(screen.getByRole("region", { name: "Salon notes" })).toBeInTheDocument();
    expect(fetchDashboard).toHaveBeenCalledWith("month", "tok", "admin_1");
  });

  it("asks again when the period changes", async () => {
    fetchDashboard.mockResolvedValue(base());
    render(<Dashboard />);
    await screen.findByRole("group", { name: "Collected" });
    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledWith("week", "tok", "admin_1"));
  });

  it("a slow earlier answer cannot replace the one for the period now chosen", async () => {
    const withCollected = (range: DashboardResponse["range"], value: number) =>
      base({ range, kpis: { ...base().kpis, collected: { value, previous: 1 } } });
    fetchDashboard.mockResolvedValueOnce(base()); // the first load (month)
    render(<Dashboard />);
    await screen.findByRole("group", { name: "Collected" });

    // choose "This week" (its answer is slow), then "Last 30 days" (answered at once)
    let releaseWeek: (d: DashboardResponse) => void = () => {};
    fetchDashboard.mockImplementationOnce(() => new Promise<DashboardResponse>((resolve) => { releaseWeek = resolve; }));
    fetchDashboard.mockResolvedValueOnce(withCollected("last30", 777));
    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Last 30 days" }));
    expect(await screen.findByText("₱777")).toBeInTheDocument();

    releaseWeek(withCollected("week", 999)); // arrives late
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText("₱777")).toBeInTheDocument();
    expect(screen.queryByText("₱999")).toBeNull();
  });

  it("shows empty states instead of blank charts when nothing has happened", async () => {
    fetchDashboard.mockResolvedValue(
      base({
        kpis: { collected: { value: 0, previous: 0 }, estimatedSales: { value: 0, previous: 0 }, bookings: { value: 0, previous: 0 }, newClients: { value: 0, previous: 0 } },
        monthly: base().monthly.map((m) => ({ ...m, completed: 0, cancelled: 0 })),
        services: [], artists: [], next: [],
        weekdays: base().weekdays.map((w) => ({ ...w, bookings: 0 })),
        outcomes: { confirmed: 0, completed: 0, pending: 0, cancelled: 0, refunded: 0 },
      }),
    );
    fetchAppointments.mockResolvedValueOnce([]);
    render(<Dashboard />);
    expect(await screen.findByText("No upcoming bookings.")).toBeInTheDocument();
    expect(screen.getAllByText(/Nothing to show yet|No bookings/).length).toBeGreaterThan(0);
  });

  it("offers a retry when the numbers cannot be loaded", async () => {
    fetchDashboard.mockRejectedValueOnce(new Error("boom"));
    fetchDashboard.mockResolvedValueOnce(base());
    render(<Dashboard />);
    expect(await screen.findByText(/couldn't load the dashboard/i)).toBeInTheDocument();
    // the rest of the admin is still one tap away
    expect(screen.getByRole("link", { name: "Open appointments" })).toHaveAttribute("href", "/clients");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("group", { name: "Collected" })).toBeInTheDocument();
  });
});
