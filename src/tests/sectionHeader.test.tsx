import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SectionHeader } from "@/components/molecules";

describe("SectionHeader label size", () => {
  it("renders a small grey h3 label", () => {
    render(<SectionHeader size="label" title="Day Off" />);
    const h = screen.getByRole("heading", { level: 3, name: "Day Off" });
    expect(h.className).toBe("text-[13px] font-medium text-gray-red/80");
    expect(h.parentElement?.className).toBe("flex items-center justify-between");
  });
});

describe("SectionHeader section size", () => {
  it("shows a subtitle under the heading", () => {
    render(<SectionHeader size="section" title="Book your visit" subtitle="Select your preferred artist." />);
    const heading = screen.getByRole("heading", { level: 2, name: "Book your visit" });
    const sub = screen.getByText("Select your preferred artist.");
    expect(sub.tagName).toBe("P");
    expect(heading.compareDocumentPosition(sub) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("has no subtitle paragraph without one", () => {
    const { container } = render(<SectionHeader size="section" title="Popular services" />);
    expect(container.querySelector("p")).toBeNull();
  });
});
