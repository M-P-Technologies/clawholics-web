import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClientDirectory from "@/admin/ClientDirectory";

let params = new URLSearchParams();
vi.mock("@/lib/router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/router")>()),
  useSearchParams: () => [params] as const,
}));
vi.mock("@/components/admin/SideBar", () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock("@/services/directoryService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/directoryService")>()),
  fetchDirectoryUsers: async () => [
    { id: "user_ana", clerk_id: "user_ana", firstName: "Ana", lastName: "Cruz", phoneNumber: "09171234567", role: "customer" },
    { id: "user_bea", clerk_id: "user_bea", firstName: "Bea", lastName: "Lim", phoneNumber: "09181234567", role: "customer" },
  ],
}));
const fetchWarmLeads = vi.fn();
vi.mock("@/services/dashboardService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/dashboardService")>()),
  fetchWarmLeads: (...a: unknown[]) => fetchWarmLeads(...a),
}));

beforeEach(() => {
  params = new URLSearchParams();
  fetchWarmLeads.mockReset().mockResolvedValue({ clerkIds: ["user_bea"] });
});

describe("Client Directory: warm leads", () => {
  it("shows only the warm leads when opened from the dashboard, with a way back to everyone", async () => {
    params = new URLSearchParams("view=leads");
    render(<ClientDirectory />);
    expect(await screen.findByText(/1 warm lead: made an account or started a booking in the last 60 days, but hasn't booked a visit/)).toBeInTheDocument();
    const list = within(screen.getByRole("group", { name: "Clients (phone)" }));
    expect(list.getByRole("button", { name: /Bea Lim/ })).toBeInTheDocument();
    expect(list.queryByRole("button", { name: /Ana Cruz/ })).toBeNull();
    expect(screen.getByRole("link", { name: "Show all clients" })).toHaveAttribute("href", "/client-directory");
  });

  it("says so when there are no warm leads", async () => {
    params = new URLSearchParams("view=leads");
    fetchWarmLeads.mockResolvedValue({ clerkIds: [] });
    render(<ClientDirectory />);
    expect(await screen.findByText("No warm leads right now.")).toBeInTheDocument();
  });

  it("shows everyone, without asking for leads, otherwise", async () => {
    render(<ClientDirectory />);
    const list = within(await screen.findByRole("group", { name: "Clients (phone)" }));
    expect(list.getByRole("button", { name: /Ana Cruz/ })).toBeInTheDocument();
    expect(list.getByRole("button", { name: /Bea Lim/ })).toBeInTheDocument();
    expect(fetchWarmLeads).not.toHaveBeenCalled();
  });
});
