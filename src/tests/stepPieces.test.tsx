import { render, screen } from "@testing-library/react";
import { TimeSlotList } from "@/components/molecules";
import { describe, expect, it, vi } from "vitest";
import BookingOptions from "@/components/features/client/booking/BookingOptions";
import DayCalendar from "@/components/features/client/booking/DayCalendar";

const slots = ["09:00-11:00", "11:00-13:00", "13:00-15:00"];
const fmt = (s: string) => s;

describe("time slots", () => {
  const props = { slots, selected: "09:00-11:00", onSelect: vi.fn(), isBlocked: (s: string) => s === "13:00-15:00", format: fmt, emptyText: "none" };

  it("are pills, with selected, free and taken looking different, and the chosen one pressed", () => {
    render(<TimeSlotList {...props} boxed />);
    const [selected, free, taken] = slots.map((s) => screen.getByRole("button", { name: s }));
    for (const b of [selected, free, taken]) expect(b).toHaveClass("rounded-full");
    expect(selected).toHaveClass("bg-berry", "text-pearl");
    expect(selected).toHaveAttribute("aria-pressed", "true");
    expect(free).toHaveAttribute("aria-pressed", "false");
    expect(free).toHaveClass("bg-milk");
    expect(taken).toBeDisabled();
    expect(taken).toHaveClass("line-through");
    expect(screen.getByRole("heading", { level: 3, name: "Time" })).toBeInTheDocument();
  });

  it("sits in its own tinted box when boxed, and plainly otherwise", () => {
    const { container, rerender } = render(<TimeSlotList {...props} boxed />);
    expect(container.firstElementChild).toHaveClass("rounded-xl", "p-4");
    rerender(<TimeSlotList {...props} />);
    expect(container.firstElementChild).not.toHaveClass("p-4");
  });

  it("lays the slots out in two scrolling columns for a narrow dialog", () => {
    render(<TimeSlotList {...props} columns={2} />);
    const grid = screen.getByRole("button", { name: "09:00-11:00" }).parentElement!;
    expect(grid).toHaveClass("grid-cols-2", "overflow-y-auto");
  });

  it("says why there are no times, in a tinted note", () => {
    render(<TimeSlotList {...props} slots={[]} emptyText="Select a date first." />);
    expect(screen.getByText("Select a date first.")).toHaveClass("rounded-xl");
  });
});

describe("booking options", () => {
  it("titles each group in sentence case", () => {
    render(<BookingOptions variants={[{ id: 1, name: "Short", price: 500 }]} addons={[{ id: 2, name: "Chrome", price: 150 }]} variantId={1} addonIds={[]} onVariantChange={vi.fn()} onAddonsChange={vi.fn()} />);
    expect(screen.getByText("Choose an option")).toBeInTheDocument();
    expect(screen.getByText("Add-ons")).toBeInTheDocument();
    expect(screen.queryByText("CHOOSE AN OPTION")).toBeNull();
  });
});

describe("choice row", () => {
  it("is a rounded milk row in the app look, the selected one tinted", async () => {
    const { ChoiceRow } = await import("@/components/molecules");
    render(<><ChoiceRow selected onClick={vi.fn()}>A</ChoiceRow><ChoiceRow selected={false} onClick={vi.fn()}>B</ChoiceRow></>);
    const [on, off] = screen.getAllByRole("radio");
    for (const r of [on, off]) {
      expect(r).toHaveClass("rounded-xl");
      expect(r).not.toHaveClass("bg-light-orange", "rounded-sm");
    }
    expect(on).toHaveClass("border-crimson", "bg-crimson-light/15");
    expect(off).toHaveClass("bg-milk");
  });
});

describe("day calendar", () => {
  it("fills the chosen day's own button, so it shows on the milk days even without focus", () => {
    const now = new Date();
    const chosen = new Date(now.getFullYear(), now.getMonth(), 20);
    render(<DayCalendar month={chosen} onMonthChange={vi.fn()} selected={chosen} onSelect={vi.fn()} isDisabled={() => false} isFullyBooked={() => false} />);
    const button = screen.getByRole("button", { name: /\b20(st|nd|rd|th)?,.*selected/i });
    expect(button.parentElement).toHaveClass("[&>button]:!bg-crimson", "[&>button]:!text-milk");
  });
});
