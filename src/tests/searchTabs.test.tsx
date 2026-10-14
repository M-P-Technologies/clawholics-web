import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SearchBar, Tabs } from "@/components/molecules";

describe("SearchBar", () => {
  it("submits as a search form", () => {
    const onSubmit = vi.fn();
    const onChange = vi.fn();
    render(<SearchBar value="gel" onChange={onChange} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search services" }), { target: { value: "gel x" } });
    expect(onChange).toHaveBeenCalledWith("gel x");
    fireEvent.submit(screen.getByRole("search"));
    expect(onSubmit).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });
  it("is a plain box with a trailing control and no submit", () => {
    render(<SearchBar value="" onChange={() => {}} trailing={<button>Filter</button>} />);
    expect(screen.queryByRole("search")).toBeNull();
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
  });
});

function Demo() {
  const [tab, setTab] = useState<"a" | "b" | "c">("a");
  return <Tabs label="Sections" idPrefix="t" value={tab} onChange={setTab} tabs={[{ value: "a", label: "Overview" }, { value: "b", label: "Notes", count: 3 }, { value: "c", label: "Visits" }]} />;
}

describe("Tabs", () => {
  it("marks the selected tab and wires the panels", () => {
    render(<Demo />);
    const overview = screen.getByRole("tab", { name: "Overview" });
    expect(overview).toHaveAttribute("aria-selected", "true");
    expect(overview).toHaveAttribute("aria-controls", "t-panel-a");
    expect(screen.getByRole("tab", { name: /Notes/ })).toHaveTextContent("3");
  });
  it("moves with the arrow keys, wrapping round", () => {
    render(<Demo />);
    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: /Notes/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: /Notes/ }), { key: "ArrowLeft" });
    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "Visits" })).toHaveAttribute("aria-selected", "true");
  });
});
