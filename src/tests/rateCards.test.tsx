import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import RateCards from "@/components/features/admin/dashboard/RateCards";
import { dashboardData } from "./dashboardFixture";

const { rates, leads, rateTrend } = dashboardData;
const NAMES = ["Cancellation rate", "Booking conversion", "Lead conversion", "Repeat rate"];

// The Performance page's top row
describe("RateCards", () => {
  it("shows the four rates as stat cards, two across and four from xl", () => {
    render(<RateCards rates={rates} leads={leads} rateTrend={rateTrend} />);
    const row = screen.getByRole("region", { name: "Key rates" });
    expect(row.className).toContain("grid-cols-2");
    expect(row.className).toContain("xl:grid-cols-4");
    expect(within(row).getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual(NAMES);
    for (const name of NAMES) {
      const card = within(screen.getByRole("group", { name }));
      expect(card.getByTestId("kpi-icon")).toBeInTheDocument();
      expect(card.getByRole("button", { name: `About ${name}` })).toBeInTheDocument();
    }
  });

  it("shows each rate with its change in points; a higher cancellation rate reads as bad", () => {
    render(<RateCards rates={rates} leads={leads} rateTrend={rateTrend} />);
    const cancellation = within(screen.getByRole("group", { name: "Cancellation rate" }));
    expect(cancellation.getByText("20%")).toBeInTheDocument();
    expect(cancellation.getByText("+15 pts").parentElement).toHaveClass("bg-danger/15");
    expect(within(screen.getByRole("group", { name: "Booking conversion" })).getByText("90%")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Repeat rate" })).getByText("40%")).toBeInTheDocument();
  });

  it("shows lead conversion with its counts", () => {
    render(<RateCards rates={rates} leads={leads} rateTrend={rateTrend} />);
    const card = within(screen.getByRole("group", { name: "Lead conversion" }));
    expect(card.getByText("50%")).toBeInTheDocument();
    expect(card.getByText("2 of 4 new accounts booked")).toBeInTheDocument();
  });

  it("draws each rate so far in the period as a small line, described in words", () => {
    render(<RateCards rates={rates} leads={leads} rateTrend={rateTrend} granularity="day" />);
    expect(screen.getByRole("img", { name: "Cancellation rate per day, from 10% to 20%" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Lead conversion per day, from 25% to 50%" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Repeat rate per day, from 0% to 40%" })).toBeInTheDocument();
    // nothing to divide by on the first day: it reads "–" there, and the line starts at the first rate
    const conversion = screen.getByRole("img", { name: "Booking conversion per day, from 80% to 90%" });
    expect([...conversion.querySelectorAll("title")].map((t) => t.textContent)).toEqual(["Oct 12: –", "Oct 13: 80%", "Oct 14: 90%"]);
  });

  it("draws no line for a rate with nothing to divide by all period", () => {
    const none = rateTrend.map((p) => ({ ...p, leadConversion: null }));
    render(<RateCards rates={rates} leads={leads} rateTrend={none} />);
    expect(screen.queryByRole("img", { name: /Lead conversion/ })).toBeNull();
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });
});
