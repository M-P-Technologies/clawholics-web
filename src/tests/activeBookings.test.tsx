import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ActiveBookings from "@/components/admin/dashboard/ActiveBookings";
import type { Appointment } from "@/services/appointmentService";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

const appt = (id: number, over: Partial<Appointment>): Appointment => ({
  id, user_id: id, service_name: "Gel", nailist_name: "Maxine", appointment_date: "2026-10-14", appointment_time: "10:00-11:00",
  status: "CONFIRMED", first_name: `Client${id}`, last_name: "Cruz", ...over,
});

const rows = [
  appt(1, { appointment_time: "13:00-14:30", first_name: "Jessica", last_name: "Davis", service_name: "Manicure & Pedicure", nailist_name: "Anna" }),
  appt(2, { appointment_time: "09:00-10:15", first_name: "Michael", last_name: "Brown", status: "COMPLETED" }),
  appt(3, { appointment_time: "10:00-11:00", first_name: "Jeff", last_name: "Buckley" }),
  appt(4, { appointment_time: "15:00-16:00", status: "CANCELLED", first_name: "Gone" }),
  appt(5, { appointment_date: "2026-10-15", first_name: "Tomorrow" }),
  appt(6, { appointment_time: "16:00-17:00", status: "PENDING", first_name: "Unpaid" }),
];

const load = vi.fn();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T02:30:00Z")); // 10:30 in Manila
  load.mockReset().mockResolvedValue(rows);
});
afterEach(() => vi.useRealTimers());

describe("ActiveBookings", () => {
  it("lists today's confirmed and completed bookings in time order", async () => {
    render(<ActiveBookings load={load} />);
    const card = within(await screen.findByRole("region", { name: "Active bookings" }));
    const items = card.getAllByRole("listitem");
    expect(items.map((i) => i.querySelector("p")?.textContent)).toEqual(["Michael Brown", "Jeff Buckley", "Jessica Davis"]);
    expect(card.queryByText(/Gone|Tomorrow|Unpaid/)).toBeNull();
    expect(card.getByText("Wed, Oct 14")).toBeInTheDocument();
  });

  it("shows the service, the artist and the time range on each", async () => {
    render(<ActiveBookings load={load} />);
    const jessica = within((await screen.findByText("Jessica Davis")).closest("li")!);
    expect(jessica.getByText("Manicure & Pedicure")).toBeInTheDocument();
    expect(jessica.getByText("Anna")).toBeInTheDocument();
    expect(jessica.getByText("1:00 PM – 2:30 PM")).toBeInTheDocument();
  });

  it("marks the one happening now, and the ones already done", async () => {
    render(<ActiveBookings load={load} />);
    const jeff = within((await screen.findByText("Jeff Buckley")).closest("li")!);
    expect(jeff.getByText("Now")).toBeInTheDocument();
    expect(within(screen.getByText("Michael Brown").closest("li")!).getByText("Done")).toBeInTheDocument();
  });

  it("says so when nothing is booked today", async () => {
    load.mockResolvedValue([appt(5, { appointment_date: "2026-10-15" })]);
    render(<ActiveBookings load={load} />);
    expect(await screen.findByText("No bookings today.")).toBeInTheDocument();
  });

  it("shows only the top three: the one now, then the next ones, then the latest finished; the rest behind a link", async () => {
    load.mockResolvedValue([
      appt(10, { appointment_time: "08:00-09:00", first_name: "Early", last_name: "Done", status: "COMPLETED" }),
      appt(11, { appointment_time: "09:00-10:00", first_name: "Later", last_name: "Done" }),
      appt(12, { appointment_time: "10:00-11:00", first_name: "Right", last_name: "Now" }),
      appt(13, { appointment_time: "12:00-13:00", first_name: "Next", last_name: "One" }),
      appt(14, { appointment_time: "15:00-16:00", first_name: "After", last_name: "That" }),
    ]);
    render(<ActiveBookings load={load} />);
    const card = within(await screen.findByRole("region", { name: "Active bookings" }));
    expect(card.getAllByRole("listitem").map((i) => i.querySelector("p")?.textContent)).toEqual(["Right Now", "Next One", "After That"]);
    expect(card.getByRole("link", { name: "+2 more today" })).toHaveAttribute("href", "/schedule");
  });

  it("fills up with the latest finished ones when fewer than three are still to come", async () => {
    render(<ActiveBookings load={load} />); // Michael done, Jeff now, Jessica next
    const card = within(await screen.findByRole("region", { name: "Active bookings" }));
    expect(card.getAllByRole("listitem")).toHaveLength(3);
    expect(card.queryByRole("link")).toBeNull();
  });
});

