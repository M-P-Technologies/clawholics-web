import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TimeSlotList from "@/components/features/client/booking/TimeSlotList";
import BookingOptions from "@/components/features/client/booking/BookingOptions";
import DayCalendar from "@/components/features/client/booking/DayCalendar";

const slots = ["09:00-11:00", "11:00-13:00", "13:00-15:00"];
const fmt = (s: string) => s;

describe("time slots", () => {
  it("are pills in a tinted box, with selected, free and taken looking different", () => {
    render(<TimeSlotList slots={slots} selected="09:00-11:00" onSelect={vi.fn()} isBlocked={(s) => s === "13:00-15:00"} format={fmt} emptyText="none" />);
    const [selected, free, taken] = slots.map((s) => screen.getByRole("button", { name: s }));
    for (const b of [selected, free, taken]) expect(b).toHaveClass("rounded-full");
    expect(selected).toHaveClass("bg-crimson", "text-milk");
    expect(free).not.toHaveClass("bg-crimson");
    expect(taken).toBeDisabled();
    expect(taken.className).not.toBe(free.className);
    expect(selected.parentElement!.closest(".rounded-xl")).not.toBeNull(); // surface.tint
    expect(screen.getByRole("heading", { level: 3, name: "Time" })).toBeInTheDocument();
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
