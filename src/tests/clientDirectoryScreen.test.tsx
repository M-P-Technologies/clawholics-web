import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientDirectory from "@/app/(admin)/clients/page";
import type { Appointment } from "@/services/appointmentService";

let params = new URLSearchParams();
vi.mock("@/lib/router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/router")>()),
  useSearchParams: () => [params] as const,
}));
vi.mock("@/components/features/admin/shell/SideBar", () => ({ default: () => <div data-testid="sidebar" /> }));
// A stable getToken, as the real Clerk hook has
vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok", isLoaded: true };
  const user = { user: { id: "admin_1" } };
  return { useAuth: () => auth, useUser: () => user };
});
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show: vi.fn() }) }));
vi.mock("@/hooks/usePolling", () => ({ usePolling: () => {} }));
vi.mock("@/services/directoryService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/directoryService")>()),
  fetchDirectoryUsers: async () => [
    { id: "user_ana", clerk_id: "user_ana", user_id: 5, firstName: "Ana", lastName: "Cruz", phoneNumber: "09171234567", role: "customer" },
    { id: "user_bea", clerk_id: "user_bea", user_id: 6, firstName: "Bea", lastName: "Lim", phoneNumber: "09181234567", role: "customer" },
    { id: "user_max", clerk_id: "user_max", user_id: 1, firstName: "Max", lastName: "Owner", phoneNumber: "", role: "admin" },
  ],
  fetchDirectoryProfiles: async () => ({ profiles: { user_ana: { imageUrl: "https://img.clerk.com/ana.png", joinedAt: "2026-06-01T00:00:00.000Z", lastSignInAt: null } } }),
}));
vi.mock("@/services/dashboardService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/dashboardService")>()),
  fetchWarmLeads: async () => ({ clerkIds: ["user_bea"] }),
}));
vi.mock("@/services/appointmentService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/appointmentService")>()),
  fetchAppointments: async (): Promise<Appointment[]> => [
    { id: 11, user_id: 5, first_name: "Ana", last_name: "Cruz", email: "ana@x.test", phone: "09171234567", service_name: "Gel", nailist_name: "Maxine", appointment_date: "2026-11-02", appointment_time: "10:00-11:00", status: "CONFIRMED" },
  ],
}));

beforeEach(() => {
  params = new URLSearchParams();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json([])));
});

describe("Clients & Bookings", () => {
  it("shows the client totals and the appointments with each client's details", async () => {
    render(<ClientDirectory />);
    expect(screen.getByRole("heading", { name: "Clients & Bookings" })).toBeInTheDocument();
    const totals = within(screen.getByRole("region", { name: "Client totals" }));
    expect(await totals.findByText("2")).toBeInTheDocument(); // two clients; the admin isn't counted
    const table = within(await screen.findByRole("table", { name: "Appointments" }));
    expect(table.getByRole("link", { name: "Ana Cruz" })).toHaveAttribute("href", "/clients/5");
    expect(await table.findByText("Jun 2026")).toBeInTheDocument();
    // The client list and its profile card are gone
    expect(screen.queryByRole("region", { name: "Clients" })).toBeNull();
    expect(screen.queryByRole("table", { name: "Clients" })).toBeNull();
  });

  it("lists the warm leads when opened from the dashboard, with a way back", async () => {
    params = new URLSearchParams("view=leads");
    render(<ClientDirectory />);
    expect(await screen.findByText(/1 warm lead: made an account or started a booking in the last 60 days, but hasn't booked a visit/)).toBeInTheDocument();
    const leads = within(screen.getByRole("table", { name: "Warm leads" }));
    expect(leads.getByRole("button", { name: /Bea Lim/ })).toBeInTheDocument();
    expect(leads.queryByRole("button", { name: /Ana Cruz/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Back to the appointments" })).toHaveAttribute("href", "/clients");
  });

  it("doesn't list the leads otherwise", async () => {
    render(<ClientDirectory />);
    await screen.findByRole("table", { name: "Appointments" });
    expect(screen.queryByRole("region", { name: "Warm leads" })).toBeNull();
  });
});
