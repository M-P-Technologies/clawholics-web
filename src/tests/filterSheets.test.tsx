import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterSheets, type SheetFilter } from "@/components/organisms";

const make = (pick = vi.fn()): SheetFilter[] => [
  { key: "status", title: "Status", value: "all", options: [{ value: "all", label: "All Statuses" }, { value: "completed", label: "Completed" }], pick },
  { key: "sort", title: "Sort by", value: "newest", options: [{ value: "newest", label: "Appt Date (Newest)" }, { value: "oldest", label: "Appt Date (Oldest)" }], pick: vi.fn() },
];

describe("FilterSheets", () => {
  it("shows every filter in one row, each with what is chosen", () => {
    render(<FilterSheets filters={make()} />);
    expect(screen.getByRole("button", { name: "Status: All Statuses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sort by: Appt Date (Newest)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Status: All Statuses" }).parentElement).toHaveStyle({ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" });
  });

  it("opens a filter's options in a drawer, marks the chosen one, and picks another", () => {
    const pick = vi.fn();
    render(<FilterSheets filters={make(pick)} />);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Status: All Statuses" }));
    const list = within(screen.getByRole("listbox", { name: "Status" }));
    expect(list.getByRole("option", { name: "All Statuses" })).toHaveAttribute("aria-selected", "true");
    expect(list.getByRole("option", { name: "Completed" })).toHaveAttribute("aria-selected", "false");
    fireEvent.click(list.getByRole("button", { name: "Completed" }));
    expect(pick).toHaveBeenCalledWith("completed");
    expect(screen.queryByRole("listbox")).toBeNull();
  });
});
