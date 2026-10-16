import { fireEvent, render, screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { StatCard } from "@/components/molecules";
import PeriodSwitch from "@/components/features/admin/dashboard/PeriodSwitch";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

describe("StatCard", () => {
  it("shows the label, the value and how it moved, in words as well as an arrow", () => {
    render(<StatCard label="Collected" value="₱2,000" change={{ kind: "up", label: "+100%" }} />);
    expect(screen.getByRole("group", { name: "Collected" })).toBeInTheDocument();
    expect(screen.getByText("₱2,000")).toBeInTheDocument();
    expect(screen.getByText("+100%")).toBeInTheDocument();
    expect(screen.getByText("up, compared with the previous period")).toBeInTheDocument();
  });

  it("says 'new' and 'no data' plainly", () => {
    const { rerender } = render(<StatCard label="New clients" value="2" change={{ kind: "new", label: "new" }} />);
    expect(screen.getByText("new")).toBeInTheDocument();
    rerender(<StatCard label="Returning" value="–" change={{ kind: "none", label: "–" }} />);
    expect(screen.getByText("no comparison available")).toBeInTheDocument();
  });

  it("works without a change (a tile with no comparison)", () => {
    render(<StatCard label="Lapsed clients" value="4" hint="no visit in 60 days" />);
    expect(screen.getByText("no visit in 60 days")).toBeInTheDocument();
    expect(screen.queryByText(/compared with/)).toBeNull();
  });
});

describe("StatCard icon", () => {
  it("shows a decorative icon badge in the corner when given one", () => {
    render(<StatCard label="Collected" value="₱1" icon={Wallet} />);
    const badge = screen.getByTestId("kpi-icon");
    expect(badge).toHaveAttribute("aria-hidden", "true");
    expect(badge.querySelector("svg")).not.toBeNull();
  });

  it("has no badge without an icon", () => {
    render(<StatCard label="Lapsed clients" value="4" />);
    expect(screen.queryByTestId("kpi-icon")).toBeNull();
  });

  it("keeps the label clear of the badge", () => {
    render(<StatCard label="Estimated sales" value="₱1" icon={Wallet} />);
    expect(screen.getByText("Estimated sales").className).toContain("pr-9");
  });
});

describe("StatCard with a big number", () => {
  it("lets a long amount shrink on a phone and wrap instead of overflowing its card", () => {
    render(<StatCard label="Estimated sales" value="₱1,250,000" />);
    const value = screen.getByText("₱1,250,000");
    expect(value.className).toContain("text-3xl");
    expect(value.className).toContain("sm:text-4xl");
    expect(value.className).toContain("wrap-break-word");
  });
});

describe("PeriodSwitch", () => {
  it("offers the five periods and reports the one chosen", () => {
    const onChange = vi.fn();
    render(<PeriodSwitch value="month" onChange={onChange} />);
    for (const name of ["This week", "This month", "Last 30 days", "Last 3 months", "This year"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "This month" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Last 30 days" }));
    expect(onChange).toHaveBeenCalledWith("last30");
  });
});
