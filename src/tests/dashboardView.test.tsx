import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardView from "@/components/features/admin/dashboard/DashboardView";
import { dashboardData } from "./dashboardFixture";
import { paged } from "./fakeAppointmentPages";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

const data = dashboardData;
const GLANCE = ["Total clients", "Total services", "Artists", "Appointments"];

describe("DashboardView layout", () => {
  it("puts the salon at a glance first, then the salon notes, then the rest", () => {
    render(<DashboardView data={data} />);
    const collected = screen.getByRole("region", { name: "Salon at a glance" });
    const notes = screen.getByRole("region", { name: "Salon notes" });
    const charts = screen.getByRole("region", { name: "Bookings over time" });
    expect(collected.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notes.compareDocumentPosition(charts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("puts the notes in a column on the right on desktop that stays in view", () => {
    render(<DashboardView data={data} />);
    const column = screen.getByRole("region", { name: "Salon notes" }).parentElement as HTMLElement;
    expect(column.className).toContain("lg:order-last");
    expect(column.className).toContain("lg:sticky");
  });

  it("gives the notes one column of three from lg, the charts taking two", () => {
    render(<DashboardView data={data} />);
    const column = screen.getByRole("region", { name: "Salon notes" }).parentElement as HTMLElement;
    const lower = column.parentElement as HTMLElement;
    const main = (screen.getByRole("region", { name: "Bookings over time" }).parentElement as HTMLElement).parentElement as HTMLElement;
    expect(lower.className).toContain("lg:grid-cols-3");
    expect(main.className).toContain("lg:col-span-2");
  });

  it("spaces every card the same: gap-3, and gap-6 from md up", () => {
    render(<DashboardView data={data} />);
    const statGrid = screen.getByRole("region", { name: "Salon at a glance" });
    const column = screen.getByRole("region", { name: "Salon notes" }).parentElement as HTMLElement;
    const lower = column.parentElement as HTMLElement;
    const charts = screen.getByRole("region", { name: "Bookings over time" }).parentElement as HTMLElement;
    const main = charts.parentElement as HTMLElement;
    const page = lower.parentElement as HTMLElement;
    for (const el of [statGrid, lower, main, charts, page]) {
      expect(el.className).toContain("gap-3");
      expect(el.className).toContain("md:gap-6");
    }
  });

  it("lays the glance cards out two across, and four across from lg, all the same width", () => {
    render(<DashboardView data={data} />);
    const grid = screen.getByRole("region", { name: "Salon at a glance" });
    expect(grid.className).toContain("grid-cols-2");
    expect(grid.className).toContain("lg:grid-cols-4");
    for (const name of GLANCE) {
      const card = screen.getByRole("group", { name });
      expect(card.parentElement).toBe(grid);
      expect(card.className).not.toContain("col-span");
    }
  });

  it("gives each of the four glance cards an icon", () => {
    render(<DashboardView data={data} />);
    for (const name of GLANCE) {
      expect(within(screen.getByRole("group", { name })).getByTestId("kpi-icon")).toBeInTheDocument();
    }
  });

  it("keeps only the essentials: the glance cards, the notes, two charts and the bookings", async () => {
    render(<DashboardView data={data} loadBookings={paged(async () => [])} />);
    for (const name of ["Salon notes", "Bookings over time", "Service mix"]) expect(screen.getByRole("region", { name })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Bookings" })).toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Active bookings" })).toBeInTheDocument();
    // moved to the Sales and Performance pages
    for (const name of ["Money", "Sales record", "Top services", "How bookings ended", "Key rates", "Busiest weekdays", "Bookings per artist", "Artist utilization"]) {
      expect(screen.queryByRole("region", { name })).toBeNull();
    }
    expect(screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual(GLANCE);
  });

  it("links to the Sales and Performance pages for the rest", () => {
    render(<DashboardView data={data} />);
    expect(screen.getByRole("link", { name: /Sales/ })).toHaveAttribute("href", "/sales");
    expect(screen.getByRole("link", { name: /Performance/ })).toHaveAttribute("href", "/performance");
  });
});

describe("DashboardView: bookings", () => {
  it("shows the bookings table in place of the next-appointments list, and today's bookings under the notes", async () => {
    const load = async () => [];
    render(<DashboardView data={data} loadBookings={paged(load)} />);
    expect(await screen.findByRole("region", { name: "Bookings" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Next appointments" })).toBeNull();
    const notes = screen.getByRole("region", { name: "Salon notes" });
    const active = await screen.findByRole("region", { name: "Active bookings" });
    expect(notes.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(active.parentElement).toBe(notes.parentElement);
  });

  it("keeps the next-appointments list without a loader (e.g. a preview)", () => {
    render(<DashboardView data={data} />);
    expect(screen.getByRole("region", { name: "Next appointments" })).toBeInTheDocument();
  });
});

describe("DashboardView next appointments (without the bookings table)", () => {
  const item = { id: 1, client_name: "Dana D", service_name: "Gel Manicure", nailist_name: "Maxine", appointment_date: "2026-10-14", appointment_time: "15:00-16:00" };

  it("lists the next appointments with who, what and when", () => {
    render(<DashboardView data={{ ...data, next: [item] }} />);
    const next = within(screen.getByRole("region", { name: "Next appointments" }));
    expect(next.getByText("Dana D")).toBeInTheDocument();
    expect(next.getByText(/Gel Manicure · Maxine/)).toBeInTheDocument();
    expect(next.getByText(/3:00 PM - 4:00 PM/)).toBeInTheDocument();
    expect(next.getByRole("link", { name: "Open the schedule" })).toHaveAttribute("href", "/schedule");
  });

  it("says so when there are none", () => {
    render(<DashboardView data={{ ...data, next: [] }} />);
    expect(screen.getByText("No upcoming confirmed appointments.")).toBeInTheDocument();
  });
});
