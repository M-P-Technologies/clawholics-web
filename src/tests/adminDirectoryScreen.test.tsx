// The Admin Directory screen with more admins than fit on a page: the table pages through them.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDirectory from "@/admin/front-desk/AdminDirectory";

vi.mock("@/components/admin/SideBar", () => ({ default: () => <div data-testid="sidebar" /> }));
vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok", isLoaded: true };
  const user = { user: { id: "admin_1" } };
  return { useAuth: () => auth, useUser: () => user };
});

const admins = Array.from({ length: 12 }, (_, i) => ({
  id: `user_${i + 1}`,
  clerk_id: `user_${i + 1}`,
  firstName: `Admin${String(i + 1).padStart(2, "0")}`,
  lastName: "Lee",
  email: `admin${i + 1}@x.test`,
  role: "admin",
}));

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      json: async () => {
        const address = new URL(String(url), "http://localhost");
        if (!address.pathname.endsWith("/users/admins")) return { profiles: {} };
        // The server's paging: one page, the total, and every admin's Clerk id
        const page = Number(address.searchParams.get("page"));
        const pageSize = Number(address.searchParams.get("pageSize"));
        return { rows: admins.slice((page - 1) * pageSize, page * pageSize), total: admins.length, page, pageSize, clerkIds: admins.map((a) => a.clerk_id) };
      },
    })),
  );
});

describe("Admin Directory", () => {
  it("shows the admins five to a page and pages through the rest", async () => {
    render(<AdminDirectory />);
    const table = within(await screen.findByRole("table", { name: "Admins" }));
    expect(table.getByText("Admin01 Lee")).toBeInTheDocument();
    expect(table.queryByText("Admin06 Lee")).toBeNull();
    expect(screen.getByText("Showing 1–5 of 12")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(await table.findByText("Admin06 Lee")).toBeInTheDocument();
    expect(screen.getByText("Showing 6–10 of 12")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("Showing 11–12 of 12")).toBeInTheDocument();
    // Each page is asked of the server
    const asked = vi.mocked(fetch).mock.calls.map(([url]) => String(url)).filter((url) => url.includes("/users/admins"));
    expect(asked.some((url) => url.includes("page=3&pageSize=5"))).toBe(true);
  });

  it("counts every admin in the totals, not just the page shown", async () => {
    render(<AdminDirectory />);
    const totals = within(await screen.findByRole("region", { name: "Admin totals" }));
    // Total admins, and Inactive (none of them has signed in here): both count all 12, not the 5 shown
    expect(await totals.findAllByText("12")).toHaveLength(2);
  });
});
