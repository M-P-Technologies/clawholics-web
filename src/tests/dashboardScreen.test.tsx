import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Dashboard from "@/app/(admin)/dashboard/page";
import Sales from "@/app/(admin)/sales/page";
import type { DashboardResponse } from "@/services/dashboardTypes";
import { pageOf } from "./fakeAppointmentPages";
import type { Appointment, AppointmentPageParams } from "@/services/appointmentService";

const fetchDashboard = vi.fn();
const QUEUE = {
  items: [{ kind: "review", appointment_id: 1, user_id: 4, client_name: "Dana D", email: "dana@x.test", service_name: "Gel Manicure", nailist_name: "Maxine",
    appointment_date: "2026-10-20", appointment_time: "15:00-16:00", since: "2026-10-13 04:00:00" }],
  counts: { review: 1, complete: 0, photos: 0, leads: 0 },
  total: 1, page: 1, pageSize: 5,
};
const fetchAttention = vi.fn(async () => QUEUE);
vi.mock("@/services/dashboardService", () => ({
  fetchDashboard: (...args: unknown[]) => fetchDashboard(...args),
  fetchAttention: () => fetchAttention(),
  fetchUtilization: async () => ({ week: { from: "2026-10-12", to: "2026-10-18" }, overall: null, artists: [] }),
}));
vi.mock("@/services/appointmentService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/appointmentService")>()),
  fetchAppointments: (...args: unknown[]) => fetchAppointments(...args),
  fetchAppointmentPage: async (params: AppointmentPageParams) => pageOf((await fetchAppointments()) as Appointment[], params),
}));
// The bookings table: Dana's upcoming visit (far ahead, so it is upcoming whatever today is)
const fetchAppointments = vi.fn(async (..._args: unknown[]) => [
  { id: 8, user_id: 4, service_name: "Gel Manicure", nailist_name: "Maxine", appointment_date: "2099-01-05", appointment_time: "15:00-16:00", status: "CONFIRMED", first_name: "Dana", last_name: "D" },
]);
vi.mock("@/components/features/admin/shell/SideBar", () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
  useLocation: () => ({ pathname: "/dashboard" }),
  useNavigate: () => () => {},
}));
// A stable getToken, as the real Clerk hook has; `clerk.loaded` stands for Clerk still starting up
// and `clerk.userId` for the user arriving after the session
const clerk = vi.hoisted(() => ({ loaded: true, userId: "admin_1" as string | undefined }));
vi.mock("@clerk/nextjs", () => {
  const getToken = async () => "tok";
  return {
    useAuth: () => ({ getToken, isLoaded: clerk.loaded }),
    useUser: () => ({ user: clerk.userId ? { id: clerk.userId } : null }),
  };
});

const base = (over: Partial<DashboardResponse> = {}): DashboardResponse => ({
  range: "month",
  period: { from: "2026-10-01", to: "2026-10-31" },
  previous: { from: "2026-09-01", to: "2026-09-30" },
  kpis: {
    collected: { value: 2000, previous: 1000 },
    estimatedSales: { value: 3100, previous: 1700 },
    bookings: { value: 7, previous: 0 },
    newClients: { value: 2, previous: 2 }, recurringClients: { value: 0, previous: 0 },
  },
  rates: {
    cancellation: { value: 2 / 9, previous: 0 },
    conversion: { value: null, previous: null },
    returning: { value: 1 / 3, previous: 0 },
    averageSale: { value: 775, previous: 567 }, leadConversion: { value: 0.5, previous: 0.5 },
  },
  lapsedClients: 1, leads: { accounts: 4, booked: 2 }, clientBase: { clients: 5, lifetimeValue: 1120, churn: 0.2 }, totals: { clients: 17, services: 35, artists: 5, appointments: 6, trend: [], growth: { clients: 15, appointments: 4, servicesBooked: { value: 8, previous: 10 }, artistsBooked: { value: 5, previous: 5 } } }, sales: [],
  loyalty: { stamps: 3, redeemed: 1 },
  attention: { today: 2, proofsToReview: 2, toComplete: 0, photosToAdd: 0, unpaid: 2, warmLeads: 0 },
  money: { grossReceipts: { value: 0, previous: 0 }, unearned: { value: 0, previous: 0 }, revenue: { value: 0, previous: 0 }, otherIncome: { value: 0, previous: 0 }, refunds: { value: 0, previous: 0 }, points: [] },
  trend: { granularity: "day", points: [] },
  monthly: [
    { month: "2026-05", completed: 0, cancelled: 0 }, { month: "2026-06", completed: 1, cancelled: 0 },
    { month: "2026-07", completed: 0, cancelled: 0 }, { month: "2026-08", completed: 0, cancelled: 0 },
    { month: "2026-09", completed: 3, cancelled: 0 }, { month: "2026-10", completed: 4, cancelled: 2 },
  ],
  services: [{ name: "Gel Manicure", bookings: 3, estimatedSales: 1300 }, { name: "Nail Art", bookings: 2, estimatedSales: 300 }],
  weekdays: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: weekday === 3 ? 2 : 0 })),
  artists: [{ name: "Jun", bookings: 4 }],
  allTime: { services: [], weekdays: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: 2 })), artists: [], decided: 10, cancellation: 0.1, conversion: 0.9, returningClients: 0, loyaltyRedeemed: 0 }, outcomes: { confirmed: 3, completed: 4, pending: 2, cancelled: 1, refunded: 1 },
  next: [{ id: 1, client_name: "Dana D", service_name: "Gel Manicure", nailist_name: "Maxine", appointment_date: "2026-10-14", appointment_time: "15:00-16:00" }],
  ...over,
});

beforeEach(() => {
  fetchDashboard.mockReset();
  clerk.loaded = true;
  clerk.userId = "admin_1";
});

describe("Dashboard", () => {
  it("shows the headline numbers with how they moved", async () => {
    fetchDashboard.mockResolvedValue(base());
    render(<Dashboard />);
    // the salon at a glance: clients who came, services, artists and confirmed appointments
    const clients = await screen.findByRole("group", { name: "Total clients" });
    expect(within(clients).getByText("17")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Total services" })).getByText("35")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Artists" })).getByText("5")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Appointments" })).getByText("6")).toBeInTheDocument();
    // the visits done moved to Performance
    expect(screen.queryByRole("group", { name: "Collected" })).toBeNull();
    expect(await screen.findByText("Dana D")).toBeInTheDocument();
    // the written summary of the period sits above the numbers
    expect(screen.getByRole("region", { name: "Salon notes" })).toBeInTheDocument();
    expect(fetchDashboard).toHaveBeenCalledWith("month", "tok", "admin_1");
  });

  it("asks for the numbers once, even under React's dev double-mount", async () => {
    fetchDashboard.mockResolvedValue(base());
    render(
      <StrictMode>
        <Dashboard />
      </StrictMode>,
    );
    await screen.findByRole("group", { name: "Total clients" });
    expect(fetchDashboard).toHaveBeenCalledTimes(1);
  });

  it("doesn't ask again when the user's details arrive after the session", async () => {
    fetchDashboard.mockResolvedValue(base());
    clerk.userId = undefined;
    const { rerender } = render(<Dashboard />);
    await screen.findByRole("group", { name: "Total clients" });
    clerk.userId = "admin_1";
    rerender(<Dashboard />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchDashboard).toHaveBeenCalledTimes(1);
  });

  it("waits for the sign-in to load before asking", async () => {
    fetchDashboard.mockResolvedValue(base());
    clerk.loaded = false;
    const { rerender } = render(<Dashboard />);
    expect(screen.getByRole("status", { name: "Loading the dashboard" })).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetchDashboard).not.toHaveBeenCalled();

    clerk.loaded = true;
    rerender(<Dashboard />);
    await screen.findByRole("group", { name: "Total clients" });
    expect(fetchDashboard).toHaveBeenCalledTimes(1);
  });

  it("shares the numbers with Sales and Performance instead of asking again", async () => {
    fetchDashboard.mockResolvedValue(base());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <Dashboard />
      </QueryClientProvider>,
    );
    await screen.findByRole("group", { name: "Total clients" });
    rerender(
      <QueryClientProvider client={client}>
        <Sales />
      </QueryClientProvider>,
    );
    expect(await screen.findByRole("heading", { name: "Sales" })).toBeInTheDocument();
    expect(fetchDashboard).toHaveBeenCalledTimes(1);
  });

  it("has no period switch: it's all time and today", async () => {
    fetchDashboard.mockResolvedValue(base());
    render(<Dashboard />);
    await screen.findByRole("group", { name: "Total clients" });
    expect(screen.queryByRole("tab", { name: "This week" })).toBeNull();
    expect(fetchDashboard).toHaveBeenCalledWith("month", "tok", "admin_1");
  });

  it("asks again when the period changes (Sales)", async () => {
    fetchDashboard.mockResolvedValue(base());
    render(<Sales />);
    await screen.findByRole("group", { name: "Gross income" });
    fireEvent.click(screen.getByRole("tab", { name: "This week" }));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledWith("week", "tok", "admin_1"));
  });

  it("a slow earlier answer cannot replace the one for the period now chosen (Sales)", async () => {
    const withReceipts = (range: DashboardResponse["range"], value: number) =>
      base({ range, money: { ...base().money, grossReceipts: { value, previous: 1 } } });
    fetchDashboard.mockResolvedValueOnce(base()); // the first load (month)
    render(<Sales />);
    await screen.findByRole("group", { name: "Gross income" });

    // choose "This week" (its answer is slow), then "Last 30 days" (answered at once)
    let releaseWeek: (d: DashboardResponse) => void = () => {};
    fetchDashboard.mockImplementationOnce(() => new Promise<DashboardResponse>((resolve) => { releaseWeek = resolve; }));
    fetchDashboard.mockResolvedValueOnce(withReceipts("last30", 777));
    fireEvent.click(screen.getByRole("tab", { name: "This week" }));
    await waitFor(() => expect(fetchDashboard).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("tab", { name: "Last 30 days" }));
    expect(await screen.findByText("₱777")).toBeInTheDocument();

    releaseWeek(withReceipts("week", 999)); // arrives late
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByText("₱777")).toBeInTheDocument();
    expect(screen.queryByText("₱999")).toBeNull();
  });

  it("shows empty states instead of blank charts when nothing has happened", async () => {
    fetchDashboard.mockResolvedValue(
      base({
        kpis: { collected: { value: 0, previous: 0 }, estimatedSales: { value: 0, previous: 0 }, bookings: { value: 0, previous: 0 }, newClients: { value: 0, previous: 0 }, recurringClients: { value: 0, previous: 0 } },
        monthly: base().monthly.map((m) => ({ ...m, completed: 0, cancelled: 0 })),
        services: [], artists: [], next: [],
        weekdays: base().weekdays.map((w) => ({ ...w, bookings: 0 })),
        outcomes: { confirmed: 0, completed: 0, pending: 0, cancelled: 0, refunded: 0 },
      }),
    );
    fetchAppointments.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    fetchAttention.mockResolvedValueOnce({ items: [], counts: { review: 0, complete: 0, photos: 0, leads: 0 }, total: 0, page: 1, pageSize: 5 });
    render(<Dashboard />);
    expect(await screen.findByText("Nothing needs attention right now.")).toBeInTheDocument();
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
    expect(await screen.findByRole("group", { name: "Total clients" })).toBeInTheDocument();
  });
});
