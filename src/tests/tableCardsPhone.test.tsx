import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BookingsTable from "@/components/features/admin/dashboard/BookingsTable";
import SalesRecord from "@/components/features/admin/dashboard/SalesRecord";
import ArtistUtilization from "@/components/features/admin/dashboard/ArtistUtilization";
import DirectoryTable from "@/components/features/admin/directory/DirectoryTable";
import type { Appointment } from "@/services/appointmentService";
import type { DashboardResponse, Utilization } from "@/services/dashboardTypes";
import type { DirectoryUser } from "@/components/features/admin/directory/DirectoryProfileCard";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

// A phone: narrower than Tailwind's md
beforeEach(() => {
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T02:00:00Z"));
});
afterEach(() => {
  delete (window as { matchMedia?: unknown }).matchMedia;
  vi.useRealTimers();
});

// The cards of a list (not the day cells nested in an artist's card)
const cards = (name: string) => Array.from(screen.getByRole("list", { name }).children) as HTMLElement[];

describe("admin tables on a phone", () => {
  it("shows bookings as cards, five to a page", async () => {
    const appt = (id: number): Appointment => ({
      id, user_id: 100 + id, service_name: "Gel", nailist_name: "Maxine", appointment_date: "2026-10-20", appointment_time: `${String(8 + id).padStart(2, "0")}:00-11:00`,
      status: "CONFIRMED", first_name: `Client${id}`, last_name: "Cruz", email: `c${id}@x.test`,
    });
    render(<BookingsTable load={async () => Array.from({ length: 7 }, (_, i) => appt(i + 1))} />);
    await screen.findByRole("list", { name: "Bookings" });
    expect(screen.queryByRole("table")).toBeNull();
    expect(cards("Bookings")).toHaveLength(5);
    const first = within(cards("Bookings")[0]);
    expect(first.getByText("Client1 Cruz")).toBeInTheDocument();
    expect(first.getByText("Confirmed")).toBeInTheDocument();
    expect(first.getByRole("link", { name: "Open Client1 Cruz" })).toHaveAttribute("href", "/clients/101");
    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(cards("Bookings")).toHaveLength(2);
  });

  it("shows sales as cards, five to a page", () => {
    type Sale = DashboardResponse["sales"][number];
    const sale = (id: number): Sale => ({ id, date: "2026-10-08", time: "10:00-11:00", client_name: `Client ${id}`, user_id: 100 + id, service_name: "Gel", nailist_name: "Maxine", fee: 800 });
    render(<SalesRecord sales={Array.from({ length: 6 }, (_, i) => sale(i + 1))} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(cards("Sales record")).toHaveLength(5);
    expect(within(cards("Sales record")[0]).getByRole("link", { name: "Client 1" })).toHaveAttribute("href", "/clients/101");
    expect(screen.getByText("Showing 1–5 of 6")).toBeInTheDocument();
  });

  it("shows each artist's week as a card", async () => {
    const day = (date: string) => ({ date, offered: 4, booked: 1, off: false });
    const dates = ["12", "13", "14", "15", "16", "17", "18"].map((d) => `2026-10-${d}`);
    const data: Utilization = {
      week: { from: "2026-10-12", to: "2026-10-18" },
      overall: 0.25,
      artists: Array.from({ length: 6 }, (_, i) => ({ id: i + 1, name: `Artist ${i + 1}`, title: null, image: null, rate: 0.25, days: dates.map(day) })),
    };
    render(<ArtistUtilization load={async () => data} />);
    await screen.findByRole("list", { name: "Artists" });
    expect(screen.queryByRole("table")).toBeNull();
    expect(cards("Artists")).toHaveLength(5);
    expect(screen.getByRole("list", { name: "Artist 1's week" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Monday: 1 of 4 slots booked").length).toBe(5);
  });

  it("shows directory people as cards that select on tap", () => {
    const person = (i: number): DirectoryUser => ({ id: `u${i}`, clerk_id: `u${i}`, firstName: `Admin${i}`, lastName: "Lim", phoneNumber: "0917", role: "admin" });
    const onSelect = vi.fn();
    render(<DirectoryTable label="Admins" users={Array.from({ length: 6 }, (_, i) => person(i + 1))} profiles={{}} selectedId="u1" onSelect={onSelect} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(cards("Admins")).toHaveLength(5);
    const second = screen.getByRole("button", { name: /Admin2 Lim/ });
    expect(screen.getByRole("button", { name: /Admin1 Lim/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(second);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "u2" }));
  });
});
