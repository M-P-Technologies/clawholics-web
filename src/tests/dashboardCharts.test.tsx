import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BarChart from "@/components/features/admin/dashboard/BarChart";
import DonutChart from "@/components/features/admin/dashboard/DonutChart";
import RankedBars from "@/components/features/admin/dashboard/RankedBars";

describe("BarChart", () => {
  const data = [
    { label: "May", a: 3, b: 1 },
    { label: "Jun", a: 0, b: 0 },
    { label: "Jul", a: 5, b: 2 },
  ];

  it("draws the months with a legend, a summary and a table", () => {
    render(<BarChart title="Bookings per month" data={data} aLabel="Completed" bLabel="Cancelled" aColor="#b83a62" bColor="#2f6fa8" emptyText="No bookings yet" />);
    expect(screen.getByRole("img", { name: /Bookings per month/ })).toBeInTheDocument();
    const legend = within(screen.getByRole("list"));
    expect(legend.getByText("Completed")).toBeInTheDocument();
    expect(legend.getByText("Cancelled")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Bookings per month" });
    expect(within(table).getAllByRole("row")).toHaveLength(4); // header + 3 months
    expect(within(table).getByText("May")).toBeInTheDocument();
  });

  it("puts each month's two bars side by side, not stacked, each scaled on its own value", () => {
    const { container } = render(<BarChart title="Bookings per month" data={data} aLabel="Completed" bLabel="Cancelled" aColor="#b83a62" bColor="#2f6fa8" emptyText="No bookings yet" />);
    const bars = (series: string) => [...container.querySelectorAll(`[data-series="${series}"]`)] as SVGRectElement[];
    const a = bars("a");
    const b = bars("b");
    expect(a).toHaveLength(2); // May and Jul (June has none)
    expect(b).toHaveLength(2);
    const num = (el: Element, attr: string) => Number(el.getAttribute(attr));
    for (let i = 0; i < a.length; i++) {
      expect(num(b[i], "x")).toBeGreaterThan(num(a[i], "x") + num(a[i], "width") - 0.01); // to the right, no overlap
      expect(num(a[i], "y") + num(a[i], "height")).toBeCloseTo(num(b[i], "y") + num(b[i], "height")); // same baseline
    }
    // July's 5 completed is the tallest; its 2 cancelled is 2/5 of that
    expect(num(b[1], "height") / num(a[1], "height")).toBeCloseTo(2 / 5);
  });

  it("labels evenly spaced gridlines from 0 up to a round number at or above the highest bar", () => {
    const { container } = render(<BarChart title="Bookings per month" data={[{ label: "Sep", a: 45, b: 60 }]} aLabel="Completed" bLabel="Cancelled" aColor="#b83a62" bColor="#2f6fa8" emptyText="No bookings yet" />);
    const ticks = [...container.querySelectorAll("[data-tick]")].map((t) => t.textContent);
    expect(ticks).toEqual(["0", "20", "40", "60"]);
  });

  it("shows only as many labels under the bars as fit, the last always, and every full name in the tooltips", () => {
    const days = Array.from({ length: 30 }, (_, i) => ({ label: `Oct ${i + 1}`, title: `October ${i + 1}`, a: i % 4, b: 1 }));
    const { container } = render(<BarChart title="Bookings over time" data={days} aLabel="Completed" bLabel="Cancelled" aColor="#b83a62" bColor="#2f6fa8" emptyText="No bookings yet" />);
    const labels = [...container.querySelectorAll("text:not([data-tick])")].map((t) => t.textContent);
    expect(labels.length).toBeGreaterThan(1);
    expect(labels.length).toBeLessThan(10);
    expect(labels[labels.length - 1]).toBe("Oct 30");
    const tips = [...container.querySelectorAll("title")].map((t) => t.textContent);
    expect(tips).toHaveLength(30);
    expect(tips[0]).toBe("October 1: 0 completed, 1 cancelled");
    expect(within(screen.getByRole("table", { name: "Bookings over time" })).getByText("October 30")).toBeInTheDocument();
  });

  it("says so instead of drawing an empty chart", () => {
    render(<BarChart title="Bookings per month" data={data.map((d) => ({ ...d, a: 0, b: 0 }))} aLabel="Completed" bLabel="Cancelled" aColor="#b83a62" bColor="#2f6fa8" emptyText="No bookings yet" />);
    expect(screen.getByText("No bookings yet")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("DonutChart", () => {
  const slices = [
    { label: "Gel Manicure", value: 3, color: "#b83a62" },
    { label: "Nail Art", value: 1, color: "#2f6fa8" },
  ];

  it("shows the total in the middle and every slice with its share in the legend", () => {
    render(<DonutChart title="Service mix" slices={slices} centerLabel="bookings" emptyText="No bookings" />);
    expect(screen.getByRole("img", { name: /Service mix/ })).toBeInTheDocument();
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
    expect(screen.getByText("bookings")).toBeInTheDocument();
    const legend = within(screen.getByRole("list"));
    expect(legend.getByText("Gel Manicure")).toBeInTheDocument();
    expect(legend.getByText("3 (75%)")).toBeInTheDocument();
    expect(legend.getByText("1 (25%)")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Service mix" })).toBeInTheDocument();
  });

  it("says so when there is nothing to show", () => {
    render(<DonutChart title="Service mix" slices={slices.map((s) => ({ ...s, value: 0 }))} centerLabel="bookings" emptyText="No bookings" />);
    expect(screen.getByText("No bookings")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("keeps the legend inside the card: beside the ring only when the card is wide, never wider than what's left", () => {
    const { container } = render(<DonutChart title="Service mix" slices={[{ label: "Softgel Extensions", value: 43, color: "#b83a62" }]} centerLabel="bookings" emptyText="None" />);
    const legend = screen.getByRole("list");
    expect(legend).toHaveClass("min-w-0", "flex-1");
    expect(legend).not.toHaveClass("w-full");
    // the row layout follows the card's own width (a container query), not the window's
    expect(container.firstElementChild).toHaveClass("@container");
    expect(legend.parentElement).toHaveClass("flex-col", "@md:flex-row");
    expect(legend.parentElement).not.toHaveClass("sm:flex-row");
  });
});

describe("RankedBars", () => {
  it("lists each row with its value and a bar sized against the largest", () => {
    render(<RankedBars title="By artist" rows={[{ label: "Jun", value: 4 }, { label: "Maxine", value: 2, valueLabel: "2 bookings" }]} emptyText="None" />);
    expect(screen.getByText("Jun")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2 bookings")).toBeInTheDocument();
    const bars = screen.getAllByTestId("ranked-bar");
    expect(bars[0]).toHaveStyle({ width: "100%" });
    expect(bars[1]).toHaveStyle({ width: "50%" });
  });

  it("says so when every value is zero or there are no rows", () => {
    const { rerender } = render(<RankedBars title="By artist" rows={[]} emptyText="None yet" />);
    expect(screen.getByText("None yet")).toBeInTheDocument();
    rerender(<RankedBars title="By artist" rows={[{ label: "Jun", value: 0 }]} emptyText="None yet" />);
    expect(screen.getByText("None yet")).toBeInTheDocument();
  });
});
