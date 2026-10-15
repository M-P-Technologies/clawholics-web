import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TimeSlotList from "@/components/features/client/booking/TimeSlotList";
import SummaryRow from "@/components/features/client/booking/SummaryRow";
import BookingOptions from "@/components/features/client/booking/BookingOptions";

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

describe("summary row", () => {
  it("has a small label and a value that wraps on a narrow phone", () => {
    render(<dl><SummaryRow label="Preferred artist" value="Maximiliana Concepcion-Dela Cruz" /></dl>);
    const dt = screen.getByText("Preferred artist").closest("dt")!;
    expect(dt).not.toHaveClass("label-caps");
    expect(dt).toHaveClass("text-[13px]");
    const dd = screen.getByText("Maximiliana Concepcion-Dela Cruz").closest("dd")!;
    expect(dd).toHaveClass("min-w-0", "break-words");
    expect(dt.parentElement).toHaveClass("border-crimson-light/40");
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
