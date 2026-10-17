import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GlanceCards from "@/components/features/admin/dashboard/GlanceCards";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

const totals = {
  clients: 17, services: 35, artists: 5, noShows: 2,
  trend: [
    { date: "2026-10-12", clients: 15, services: 2, artists: 1, noShows: 0 },
    { date: "2026-10-13", clients: 17, services: 4, artists: 3, noShows: 2 },
  ],
};

describe("GlanceCards", () => {
  it("shows the four counts, each opening its screen", () => {
    render(<GlanceCards totals={totals} />);
    const row = within(screen.getByRole("region", { name: "Salon at a glance" }));
    const card = (name: string) => within(row.getByRole("group", { name }));
    expect(card("Total clients").getByText("17")).toBeInTheDocument();
    expect(card("Total clients").getByRole("link", { name: "Open clients" })).toHaveAttribute("href", "/clients#clients");
    expect(card("Services").getByText("35")).toBeInTheDocument();
    expect(card("Services").getByRole("link", { name: "Open services" })).toHaveAttribute("href", "/nail-services");
    expect(card("Artists").getByText("5")).toBeInTheDocument();
    expect(card("Artists").getByRole("link", { name: "Open artists" })).toHaveAttribute("href", "/nail-artists");
    expect(card("No-shows").getByText("2")).toBeInTheDocument();
    expect(card("No-shows").getByRole("link", { name: "Open no-shows" })).toHaveAttribute("href", "/clients?status=NO_SHOW");
  });

  it("says what each count is", () => {
    render(<GlanceCards totals={totals} />);
    expect(screen.getByText("client accounts")).toBeInTheDocument();
    expect(screen.getByText("on the menu")).toBeInTheDocument();
    expect(screen.getByText("nail artists")).toBeInTheDocument();
    expect(screen.getByText("in the period")).toBeInTheDocument();
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
    const noShows = screen.getByRole("img", { name: "No-shows per day, from 0 to 2" });
    expect([...noShows.querySelectorAll("title")].map((t) => t.textContent)).toEqual(["Oct 12: 0", "Oct 13: 2"]);
  });

  it("draws no lines without points", () => {
    render(<GlanceCards totals={{ ...totals, trend: [] }} granularity="day" />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
