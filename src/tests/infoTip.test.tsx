import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InfoTip } from "@/components/organisms";
import DashboardView from "@/components/features/admin/dashboard/DashboardView";
import MoneyCards from "@/components/features/admin/dashboard/MoneyCards";
import PerformanceView from "@/components/features/admin/dashboard/PerformanceView";
import { STAT_INFO } from "@/lib/dashboardInfo";
import { dashboardData } from "./dashboardFixture";

// Phones: matchMedia says the window is narrower than `md`
const narrow = () =>
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }));

afterEach(() => vi.unstubAllGlobals());

describe("InfoTip", () => {
  it("shows its note as a tooltip on hover or focus, from md up", () => {
    render(<InfoTip label="Sales">What the visits sold for.</InfoTip>);
    const button = screen.getByRole("button", { name: "About Sales" });
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("What the visits sold for.");
    fireEvent.mouseLeave(button.parentElement!);
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.focus(button);
    expect(button).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
  });

  it("stays open after a click until Escape", () => {
    render(<InfoTip label="Sales">What the visits sold for.</InfoTip>);
    fireEvent.click(screen.getByRole("button", { name: "About Sales" }));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("opens its note in a bottom sheet on a phone", () => {
    narrow();
    render(<InfoTip label="Sales">What the visits sold for.</InfoTip>);
    const button = screen.getByRole("button", { name: "About Sales" });
    fireEvent.mouseEnter(button.parentElement!);
    expect(screen.queryByRole("tooltip")).toBeNull();
    fireEvent.click(button);
    const sheet = screen.getByRole("dialog", { name: "Sales" });
    expect(sheet).toHaveTextContent("What the visits sold for.");
    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the report pages' stat cards", () => {
  it("each have a note saying what they are and how they're counted", () => {
    render(
      <>
        <DashboardView data={dashboardData} />
        <MoneyCards money={dashboardData.money} />
        <PerformanceView data={dashboardData} />
      </>,
    );
    const labels = [
      "Gross income", "Unearned income", "Forfeits & late fees", "Revenue",
      "Cancellation rate", "Booking conversion", "Lead conversion", "Repeat rate",
      "Total clients", "Total services", "Artists", "Appointments",
    ];
    for (const label of labels) expect(screen.getByRole("button", { name: `About ${label}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "About Unearned income" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent(STAT_INFO.unearned.how);
  });
});
