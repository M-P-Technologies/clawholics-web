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
  it("moves focus with the arrows across three options and wraps", () => {
    function Three({ fill }: { fill?: boolean }) {
      const [v, setV] = useState<"a" | "b" | "c">("a");
      return <SegmentedControl label="Three" fill={fill} value={v} onChange={setV} options={[{ value: "a", label: "A" }, { value: "b", label: "B" }, { value: "c", label: "C" }]} />;
    }
    render(<Three />);
    screen.getByRole("tab", { name: "A" }).focus();
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "C" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "C" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
    fireEvent.keyDown(document.activeElement as Element, { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: "C" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "C" })).toHaveAttribute("aria-selected", "true");
  });
  it("can fill the row", () => {
    render(<SegmentedControl label="Fill" fill value="a" onChange={() => {}} options={[{ value: "a", label: "A" }, { value: "b", label: "B" }]} />);
    expect(screen.getByRole("tab", { name: "A" }).className).toContain("flex-1");
  });
});
