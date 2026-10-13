import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentFilters, { parseStatusParam } from "@/components/admin/AppointmentFilters";

const setup = (props: Partial<React.ComponentProps<typeof AppointmentFilters>> = {}) => {
  const handlers = { onStatus: vi.fn(), onArtist: vi.fn(), onSort: vi.fn(), onSearch: vi.fn() };
  render(
    <AppointmentFilters
      status="ALL"
      artist="All"
      sort="Upcoming First"
      search=""
      artistNames={["Ana", "Bea"]}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, phone: within(screen.getByRole("group", { name: "Filters (phone)" })) };
};

describe("AppointmentFilters on a phone", () => {
  it("shows the common statuses as chips and marks the current one", () => {
    const { phone } = setup({ status: "CONFIRMED" });
    for (const name of ["All", "Pending", "Awaiting proof", "Proofs to review", "Confirmed", "Completed"]) {
      expect(phone.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(phone.getByRole("button", { name: "Confirmed" })).toHaveAttribute("aria-pressed", "true");
    expect(phone.getByRole("button", { name: "Pending" })).toHaveAttribute("aria-pressed", "false");
    expect(phone.queryByRole("button", { name: "Cancelled" })).toBeNull();
  });

  it("a chip sets the status", () => {
    const { phone, onStatus } = setup();
    fireEvent.click(phone.getByRole("button", { name: "Pending" }));
    expect(onStatus).toHaveBeenCalledWith("PENDING");
  });

  it("typing in the search box reports the text", () => {
    const { phone, onSearch } = setup();
    fireEvent.change(phone.getByRole("searchbox", { name: "Search by appointment ID" }), { target: { value: "12" } });
    expect(onSearch).toHaveBeenCalledWith("12");
  });

  it("the Filter sheet applies a rare status and an artist", () => {
    const { phone, onStatus, onArtist, onSort } = setup();
    fireEvent.click(phone.getByRole("button", { name: "Filter" }));
    const sheet = within(screen.getByRole("dialog", { name: "Filter appointments" }));
    fireEvent.click(sheet.getByRole("button", { name: "Cancelled" }));
    fireEvent.click(sheet.getByRole("button", { name: "Artist" }));
    fireEvent.click(sheet.getByRole("option", { name: "Bea" }));
    fireEvent.click(sheet.getByRole("button", { name: "Apply" }));
    expect(onStatus).toHaveBeenCalledWith("CANCELLED");
    expect(onArtist).toHaveBeenCalledWith("Bea");
    expect(onSort).toHaveBeenCalledWith("Upcoming First");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Clear in the sheet goes back to All, All artists and the default sort", () => {
    const { phone, onStatus, onArtist, onSort } = setup({ status: "REFUNDED", artist: "Ana", sort: "Latest First" });
    fireEvent.click(phone.getByRole("button", { name: "Filter" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Clear" }));
    expect(onStatus).toHaveBeenCalledWith("ALL");
    expect(onArtist).toHaveBeenCalledWith("All");
    expect(onSort).toHaveBeenCalledWith("Upcoming First");
  });

  it("the Filter button shows a dot only when the sheet holds a non-default value", () => {
    setup({ status: "CONFIRMED" });
    expect(screen.queryByTestId("filter-dot")).toBeNull();
  });

  it("shows the dot when an artist is chosen", () => {
    setup({ artist: "Ana" });
    expect(screen.getByTestId("filter-dot")).toBeInTheDocument();
  });

  it("picking a rare status and un-picking it goes back to the chip status you had", () => {
    const { phone, onStatus } = setup({ status: "PENDING" });
    fireEvent.click(phone.getByRole("button", { name: "Filter" }));
    const sheet = within(screen.getByRole("dialog"));
    fireEvent.click(sheet.getByRole("button", { name: "Cancelled" }));
    fireEvent.click(sheet.getByRole("button", { name: "Cancelled" }));
    fireEvent.click(sheet.getByRole("button", { name: "Apply" }));
    expect(onStatus).toHaveBeenCalledWith("PENDING");
  });
});

describe("parseStatusParam", () => {
  it("accepts a known status and falls back to All", () => {
    expect(parseStatusParam("PROOF_PENDING")).toBe("PROOF_PENDING");
    expect(parseStatusParam("PENDING")).toBe("PENDING");
    expect(parseStatusParam("nonsense")).toBe("ALL");
    expect(parseStatusParam(null)).toBe("ALL");
  });
});
