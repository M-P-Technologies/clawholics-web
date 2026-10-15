import { fireEvent, render, screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import KpiCard from "@/features/dashboard/components/KpiCard";
import NextAppointments from "@/features/dashboard/components/NextAppointments";
import PeriodSwitch from "@/features/dashboard/components/PeriodSwitch";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

describe("KpiCard", () => {
  it("shows the label, the value and how it moved, in words as well as an arrow", () => {
    render(<KpiCard label="Collected" value="₱2,000" change={{ kind: "up", label: "+100%" }} />);
    expect(screen.getByRole("group", { name: "Collected" })).toBeInTheDocument();
    expect(screen.getByText("₱2,000")).toBeInTheDocument();
    expect(screen.getByText("+100%")).toBeInTheDocument();
    expect(screen.getByText("up, compared with the previous period")).toBeInTheDocument();
  });

  it("says 'new' and 'no data' plainly", () => {
    const { rerender } = render(<KpiCard label="New clients" value="2" change={{ kind: "new", label: "new" }} />);
    expect(screen.getByText("new")).toBeInTheDocument();
    rerender(<KpiCard label="Returning" value="–" change={{ kind: "none", label: "–" }} />);
    expect(screen.getByText("no comparison available")).toBeInTheDocument();
  });

  it("works without a change (a tile with no comparison)", () => {
    render(<KpiCard label="Lapsed clients" value="4" hint="no visit in 60 days" />);
    expect(screen.getByText("no visit in 60 days")).toBeInTheDocument();
    expect(screen.queryByText(/compared with/)).toBeNull();
  });
});

describe("KpiCard icon", () => {
  it("shows a decorative icon badge in the corner when given one", () => {
    render(<KpiCard label="Collected" value="₱1" icon={Wallet} />);
    const badge = screen.getByTestId("kpi-icon");
    expect(badge).toHaveAttribute("aria-hidden", "true");
    expect(badge.querySelector("svg")).not.toBeNull();
  });

  it("has no badge without an icon", () => {
    render(<KpiCard label="Lapsed clients" value="4" />);
    expect(screen.queryByTestId("kpi-icon")).toBeNull();
  });

  it("keeps the label clear of the badge", () => {
    render(<KpiCard label="Estimated sales" value="₱1" icon={Wallet} />);
    expect(screen.getByText("Estimated sales").className).toContain("pr-10");
  });
});

describe("KpiCard with a big number", () => {
  it("lets a long amount shrink on a phone and wrap instead of overflowing its card", () => {
    render(<KpiCard label="Estimated sales" value="₱1,250,000" />);
    const value = screen.getByText("₱1,250,000");
    expect(value.className).toContain("text-3xl");
    expect(value.className).toContain("sm:text-4xl");
    expect(value.className).toContain("break-words");
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

describe("NextAppointments", () => {
  const item = { id: 1, client_name: "Dana D", service_name: "Gel Manicure", nailist_name: "Maxine", appointment_date: "2026-10-14", appointment_time: "15:00-16:00" };

  it("lists the next appointments with who, what and when", () => {
    render(<NextAppointments items={[item]} />);
    expect(screen.getByText("Dana D")).toBeInTheDocument();
    expect(screen.getByText(/Gel Manicure/)).toBeInTheDocument();
    expect(screen.getByText(/Maxine/)).toBeInTheDocument();
    expect(screen.getByText(/15:00-16:00/)).toBeInTheDocument();
  });

  it("says so when there are none", () => {
    render(<NextAppointments items={[]} />);
    expect(screen.getByText("No upcoming confirmed appointments.")).toBeInTheDocument();
  });
});
