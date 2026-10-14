import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { Eye, PenLine } from "lucide-react";
import { SegmentedControl } from "@/components/molecules";

function Demo() {
  const [v, setV] = useState<"a" | "b">("a");
  return <SegmentedControl label="View" value={v} onChange={setV} options={[{ value: "a", label: "Edit", icon: PenLine }, { value: "b", label: "Preview", icon: Eye, count: 3 }]} />;
}

describe("SegmentedControl", () => {
  it("is a tab list of pills with the current one selected", () => {
    render(<Demo />);
    expect(screen.getByRole("tablist", { name: "View" }).className).toContain("rounded-full");
    expect(screen.getByRole("tab", { name: "Edit" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Preview/ })).toHaveTextContent("3");
  });
  it("switches on click and with the arrow keys", () => {
    render(<Demo />);
    fireEvent.click(screen.getByRole("tab", { name: /Preview/ }));
    expect(screen.getByRole("tab", { name: /Preview/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: /Preview/ }), { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Edit" })).toHaveAttribute("aria-selected", "true");
  });
});
