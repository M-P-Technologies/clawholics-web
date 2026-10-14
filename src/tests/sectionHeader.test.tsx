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
