import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BookingsTable from "@/components/features/admin/dashboard/BookingsTable";
import type { Appointment } from "@/services/appointmentService";
import { paged } from "./fakeAppointmentPages";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

const appt = (id: number, over: Partial<Appointment>): Appointment => ({
  id, user_id: 100 + id, service_name: "Gel", nailist_name: "Maxine", appointment_date: "2026-10-20", appointment_time: "10:00-11:00",
  status: "CONFIRMED", first_name: `Client${id}`, last_name: "Cruz", email: `c${id}@x.test`, ...over,
});

// 23 upcoming confirmed bookings (3 pages of 10), plus a past one, a cancelled one, a refunded one and a walk-in
const upcoming = Array.from({ length: 23 }, (_, i) => appt(i + 1, { appointment_date: `2026-10-${String(15 + (i % 10)).padStart(2, "0")}`, appointment_time: `${String(9 + Math.floor(i / 10)).padStart(2, "0")}:00-11:00` }));
const rows = [
  ...upcoming,
  appt(30, { appointment_date: "2026-09-01", status: "COMPLETED", first_name: "Old", last_name: "Visit" }),
  appt(31, { appointment_date: "2026-10-18", status: "CANCELLED", first_name: "Gone", last_name: "Away" }),
  appt(32, { appointment_date: "2026-10-02", status: "REFUNDED", first_name: "Money", last_name: "Back" }),
  appt(33, { appointment_date: "2026-10-16", first_name: "Walk", last_name: "In", is_walkin: 1, service_name: "Nail Art", nailist_name: "Jun" }),
];

const load = vi.fn();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T02:00:00Z"));
  load.mockReset().mockResolvedValue(rows);
});
afterEach(() => vi.useRealTimers());

const bodyRows = () => screen.getAllByRole("row").slice(1);

describe("BookingsTable", () => {
  it("opens on upcoming bookings, soonest first, five to a page", async () => {
    render(<BookingsTable load={paged(load)} />);
    const table = await screen.findByRole("table", { name: "Bookings" });
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute("aria-selected", "true");
    expect(within(table).getAllByRole("row")).toHaveLength(6); // header + 5
    expect(bodyRows()[0]).toHaveTextContent("Oct 15, 2026");
    expect(screen.getByText("Showing 1–5 of 24")).toBeInTheDocument(); // 23 + the walk-in
  });

  it("shows each booking's client, service, artist, date, time and status, and opens the client", async () => {
    render(<BookingsTable load={paged(load)} />);
    const row = within((await screen.findAllByRole("row", { name: /Client1 Cruz/ }))[0]);
    expect(row.getByText("c1@x.test")).toBeInTheDocument();
    expect(row.getByText("Gel")).toBeInTheDocument();
    expect(row.getByText("Maxine")).toBeInTheDocument();
    expect(row.getByText("10:00-11:00".replace("10", "09"))).toBeInTheDocument();
    expect(row.getByText("Confirmed")).toBeInTheDocument();
    expect(row.getByRole("link", { name: "Open Client1 Cruz" })).toHaveAttribute("href", "/clients/101");
  });

  it("has no client page for a walk-in", async () => {
    render(<BookingsTable load={paged(load)} />);
    fireEvent.change(await screen.findByRole("searchbox", { name: "Search bookings" }), { target: { value: "walk" } });
    const row = within(await screen.findByRole("row", { name: /Walk In/ }));
    expect(row.queryByRole("link")).toBeNull();
    expect(row.getByText("Walk-in")).toBeInTheDocument();
  });

  it("treats a booking on the shared walk-in guest account as a walk-in, even when it isn't flagged", async () => {
    load.mockResolvedValue([appt(40, { first_name: "Gail", last_name: "Sia", email: "walkin-guest@clawholics.local", is_walkin: 0 })]);
    render(<BookingsTable load={paged(load)} />);
    const row = within(await screen.findByRole("row", { name: /Gail Sia/ }));
    expect(row.queryByRole("link")).toBeNull();
    expect(row.getByText("Walk-in")).toBeInTheDocument();
    expect(row.queryByText("walkin-guest@clawholics.local")).toBeNull();
  });

  it("pages through, and the page numbers say where you are", async () => {
    render(<BookingsTable load={paged(load)} />);
    await screen.findByRole("table", { name: "Bookings" });
    fireEvent.click(screen.getByRole("button", { name: "Page 5" }));
    expect(screen.getByRole("button", { name: "Page 5" })).toHaveAttribute("aria-current", "page");
    await waitFor(() => expect(bodyRows()).toHaveLength(4));
    expect(screen.getByText("Showing 21–24 of 24")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(await screen.findByText("Showing 16–20 of 24")).toBeInTheDocument();
  });

  it("switches to all bookings (newest first) and to cancelled ones (cancelled and refunded)", async () => {
    render(<BookingsTable load={paged(load)} />);
    await screen.findByRole("table", { name: "Bookings" });
    fireEvent.click(screen.getByRole("tab", { name: "All" }));
    expect(await screen.findByText("Showing 1–5 of 27")).toBeInTheDocument();
    expect(bodyRows()[0]).toHaveTextContent("Oct 24, 2026");

    fireEvent.click(screen.getByRole("tab", { name: "Cancelled" }));
    await waitFor(() => expect(bodyRows()).toHaveLength(2));
    expect(bodyRows()[0]).toHaveTextContent("Gone Away");
    expect(bodyRows()[1]).toHaveTextContent("Refunded");
  });

  it("searches by client, service or artist, back on the first page", async () => {
    render(<BookingsTable load={paged(load)} />);
    await screen.findByRole("table", { name: "Bookings" });
    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search bookings" }), { target: { value: "jun" } });
    await waitFor(() => expect(bodyRows()).toHaveLength(1));
    expect(screen.getByText("Showing 1–1 of 1")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search bookings" }), { target: { value: "nobody" } });
    expect(await screen.findByText("No bookings match your search.")).toBeInTheDocument();
  });

  it("says so when the bookings can't be loaded", async () => {
    load.mockRejectedValueOnce(new Error("boom"));
    render(<BookingsTable load={paged(load)} />);
    expect(await screen.findByText("We couldn't load the bookings.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });
});
