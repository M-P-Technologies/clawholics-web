import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GlanceCards from "@/components/features/admin/dashboard/GlanceCards";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

const totals = {
  clients: 17, services: 35, artists: 5, appointments: 6,
  trend: [
    { date: "2026-10-12", clients: 15, services: 2, artists: 1, appointments: 4 },
    { date: "2026-10-13", clients: 17, services: 4, artists: 3, appointments: 6 },
  ],
  growth: { clients: 15, appointments: 0, servicesBooked: { value: 8, previous: 10 }, artistsBooked: { value: 5, previous: 5 } },
};

describe("GlanceCards", () => {
  it("shows the four counts, with no link out", () => {
    render(<GlanceCards totals={totals} />);
    const row = within(screen.getByRole("region", { name: "Salon at a glance" }));
    const card = (name: string) => within(row.getByRole("group", { name }));
    expect(card("Total clients").getByText("17")).toBeInTheDocument();
    expect(card("Total services").getByText("35")).toBeInTheDocument();
    expect(card("Artists").getByText("5")).toBeInTheDocument();
    expect(card("Appointments").getByText("6")).toBeInTheDocument();
  });

  it("shows how each grew: clients and visits since last month's end, services and artists booked this month vs last", () => {
    render(<GlanceCards totals={totals} />);
    const card = (name: string) => within(screen.getByRole("group", { name }));
    expect(card("Total clients").getByText("+13%")).toBeInTheDocument(); // 15 → 17
    expect(card("Total services").getByText("-20%")).toBeInTheDocument(); // 10 → 8 booked
    expect(card("Artists").getByText("0%")).toBeInTheDocument();
    expect(card("Appointments").getByText("new")).toBeInTheDocument(); // none before
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("says what each count is", () => {
    render(<GlanceCards totals={totals} />);
    expect(screen.getByText("confirmed and completed")).toBeInTheDocument();
    expect(screen.getByText("on the Services page")).toBeInTheDocument();
    expect(screen.getByText("on the Artists page")).toBeInTheDocument();
    expect(screen.getByText("confirmed and completed visits")).toBeInTheDocument();
  });

  it("looks like the stat cards: a milk card, the small icon badge, the number in berry", () => {
    render(<GlanceCards totals={totals} />);
    for (const card of screen.getAllByRole("group")) {
      expect(card).toHaveClass("bg-milk", "shadow-petal");
      expect(within(card).getByTestId("kpi-icon")).toHaveClass("rounded-full", "text-berry");
    }
    expect(screen.getByText("17")).toHaveClass("font-display", "text-berry");
  });

  it("draws a small line on each card, described in words", () => {
    render(<GlanceCards totals={totals} granularity="day" />);
    expect(screen.getByRole("img", { name: "Total clients per day, from 15 to 17" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Different services booked per day, from 2 to 4" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Artists with bookings per day, from 1 to 3" })).toBeInTheDocument();
    const visits = screen.getByRole("img", { name: "Appointments completed per day, from 4 to 6" });
    expect([...visits.querySelectorAll("title")].map((t) => t.textContent)).toEqual(["Oct 12: 4", "Oct 13: 6"]);
  });

  it("draws no lines without points", () => {
    render(<GlanceCards totals={{ ...totals, trend: [] }} granularity="day" />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
