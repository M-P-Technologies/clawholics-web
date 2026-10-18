import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GlanceCards from "@/components/features/admin/dashboard/GlanceCards";

const totals = {
  clients: { value: 17, previous: 15 },
  services: { value: 8, previous: 10 },
  artists: { value: 5, previous: 5 },
  appointments: { value: 6, previous: 0 },
  trend: [
    { date: "2026-10-12", clients: 1, services: 2, artists: 1, appointments: 1 },
    { date: "2026-10-13", clients: 3, services: 4, artists: 3, appointments: 4 },
  ],
};

describe("GlanceCards", () => {
  it("shows the period's four counts, with no link out", () => {
    render(<GlanceCards totals={totals} />);
    const row = within(screen.getByRole("region", { name: "Salon at a glance" }));
    const card = (name: string) => within(row.getByRole("group", { name }));
    expect(card("Total clients").getByText("17")).toBeInTheDocument();
    expect(card("Total services").getByText("8")).toBeInTheDocument();
    expect(card("Artists").getByText("5")).toBeInTheDocument();
    expect(card("Appointments").getByText("6")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("compares each with the previous period", () => {
    render(<GlanceCards totals={totals} />);
    const card = (name: string) => within(screen.getByRole("group", { name }));
    expect(card("Total clients").getByText("+13%")).toBeInTheDocument(); // 15 → 17
    expect(card("Total services").getByText("-20%")).toBeInTheDocument(); // 10 → 8
    expect(card("Artists").getByText("0%")).toBeInTheDocument();
    expect(card("Appointments").getByText("new")).toBeInTheDocument(); // none before
  });

  it("shows no pills when there's nothing to compare with (All time)", () => {
    render(<GlanceCards totals={totals} compare={false} />);
    for (const text of ["+13%", "-20%", "0%", "new"]) expect(screen.queryByText(text)).toBeNull();
    expect(screen.getByText("17")).toBeInTheDocument();
  });

  it("says what each count is", () => {
    render(<GlanceCards totals={totals} />);
    expect(screen.getByText("with a visit done")).toBeInTheDocument();
    expect(screen.getByText("booked")).toBeInTheDocument();
    expect(screen.getByText("with bookings")).toBeInTheDocument();
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

  it("draws a small line of each count within each point, described in words", () => {
    render(<GlanceCards totals={totals} granularity="day" />);
    expect(screen.getByRole("img", { name: "Clients with a visit done per day, from 1 to 3" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Different services booked per day, from 2 to 4" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Artists with bookings per day, from 1 to 3" })).toBeInTheDocument();
    const visits = screen.getByRole("img", { name: "Visits completed per day, from 1 to 4" });
    expect([...visits.querySelectorAll("title")].map((t) => t.textContent)).toEqual(["Oct 12: 1", "Oct 13: 4"]);
  });

  it("draws no lines without points", () => {
    render(<GlanceCards totals={{ ...totals, trend: [] }} granularity="day" />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
