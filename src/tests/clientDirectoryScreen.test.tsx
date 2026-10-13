import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ClientDirectory from "@/admin/ClientDirectory";

vi.mock("@/components/admin/SideBar", () => ({ default: () => <div data-testid="sidebar" /> }));
// A stable getToken, as the real Clerk hook has (the shared mock's changes every render)
vi.mock("@clerk/nextjs", () => {
  const auth = { getToken: async () => "tok", isLoaded: true };
  const user = { user: { id: "admin_1" } };
  return { useAuth: () => auth, useUser: () => user };
});
vi.mock("@/services/directoryService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/directoryService")>()),
  fetchDirectoryUsers: async () => [
    { id: "c1", firstName: "Ana", lastName: "Cruz", phoneNumber: "09171234567", role: "customer", user_id: 5 },
    { id: "c2", firstName: "Bea", lastName: "Lim", phoneNumber: "09181234567", role: "customer" },
  ],
  fetchDirectoryProfiles: async () => ({ profiles: { c1: { imageUrl: "https://img.clerk.com/ana.png", joinedAt: "2026-06-01T00:00:00.000Z", lastSignInAt: null } } }),
}));

describe("Client Directory on a phone", () => {
  it("offers Notes only for a client that has an account", async () => {
    render(<ClientDirectory />);
    const list = within(await screen.findByRole("group", { name: "Clients (phone)" }));
    const ana = list.getByRole("button", { name: /Ana Cruz/ }).parentElement!;
    const bea = list.getByRole("button", { name: /Bea Lim/ }).parentElement!;
    expect(within(ana).getByRole("button", { name: "Notes" })).toBeInTheDocument();
    expect(within(bea).queryByRole("button", { name: "Notes" })).toBeNull();
  });
});

describe("Client Directory: the table and the profile panel", () => {
  it("lists the clients in a table, with the first one's profile beside it", async () => {
    render(<ClientDirectory />);
    const table = within(await screen.findByRole("table", { name: "Clients" }));
    expect(table.getAllByRole("row")).toHaveLength(3); // header + Ana + Bea
    const ana = within(screen.getByRole("region", { name: "Ana Cruz" }));
    expect(await ana.findByRole("img", { name: "Ana Cruz" })).toHaveAttribute("src", "https://img.clerk.com/ana.png");
    expect(ana.getByRole("link", { name: "View client page" })).toHaveAttribute("href", "/clients/5");
  });

  it("shows another client's profile when their row is chosen", async () => {
    render(<ClientDirectory />);
    const table = within(await screen.findByRole("table", { name: "Clients" }));
    fireEvent.click(table.getByRole("button", { name: "Bea Lim" }));
    const bea = within(screen.getByRole("region", { name: "Bea Lim" }));
    expect(bea.queryByRole("img")).toBeNull();
    expect(bea.queryByRole("link", { name: "View client page" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Ana Cruz" })).toBeNull();
  });
});

describe("Client Directory: matching heights", () => {
  it("stretches the table and the profile card to the same height on desktop", async () => {
    render(<ClientDirectory />);
    const table = await screen.findByRole("region", { name: "Clients list" });
    const card = screen.getByRole("region", { name: "Ana Cruz" });
    const grid = table.parentElement!.parentElement!;
    expect(grid).toHaveClass("lg:grid-cols-3");
    expect(grid).not.toHaveClass("lg:items-start");
    expect(table).toHaveClass("lg:h-full");
    expect(card).toHaveClass("lg:h-full");
  });
});

