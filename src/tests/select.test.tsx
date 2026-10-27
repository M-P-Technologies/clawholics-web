import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Select } from "@/components/atoms";

const OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

const open = () => fireEvent.click(screen.getByRole("button", { name: "Status" }));

describe("Select", () => {
  it("opens its list on click, marks the chosen option and picks another", () => {
    const onChange = vi.fn();
    render(<Select aria-label="Status" value="confirmed" options={OPTIONS} onChange={onChange} />);
    expect(screen.queryByRole("listbox")).toBeNull();
    open();
    expect(screen.getByRole("option", { name: "Confirmed" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("option", { name: "Cancelled" }));
    expect(onChange.mock.calls[0][0].target.value).toBe("cancelled");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("draws the list against the window, so a table's or a card's overflow can't clip it", () => {
    render(<Select aria-label="Status" value="pending" options={OPTIONS} />);
    open();
    const list = screen.getByRole("listbox");
    expect(list).toHaveClass("fixed");
    expect(list).not.toHaveClass("absolute");
    // Placed from the control (a measured box in jsdom is all zeros, so the list sits just under it)
    expect(list.style.top).not.toBe("");
    expect(list.style.left).not.toBe("");
    expect(list.style.maxHeight).not.toBe("");
  });

  it("closes on Escape, on a click elsewhere and when the page scrolls, but not when the list itself scrolls", () => {
    render(
      <div>
        <Select aria-label="Status" value="pending" options={OPTIONS} />
        <p>elsewhere</p>
      </div>,
    );
    open();
    fireEvent.keyDown(screen.getByRole("button", { name: "Status" }), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();

    open();
    fireEvent.mouseDown(screen.getByText("elsewhere"));
    expect(screen.queryByRole("listbox")).toBeNull();

    open();
    fireEvent.scroll(screen.getByRole("listbox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.scroll(document);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("moves through the options with the arrow keys and picks with Enter", () => {
    const onChange = vi.fn();
    render(<Select aria-label="Status" value="pending" options={OPTIONS} onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: "Status" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange.mock.calls[0][0].target.value).toBe("confirmed");
  });
});
