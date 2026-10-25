import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SpecialtyList from "@/components/booking/SpecialtyList";

describe("SpecialtyList", () => {
  it("puts each specialty on its own line when they're written one per line", () => {
    render(<SpecialtyList specialty={"• Russian Manicure\n• Hard Gel & BIAB Overlays\n"} />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Russian Manicure", "Hard Gel & BIAB Overlays"]);
  });

  it("splits ones written on a single line with bullets", () => {
    render(<SpecialtyList specialty="• Nail Art • Gel Manicures • Soft Gel Tips" />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Nail Art", "Gel Manicures", "Soft Gel Tips"]);
  });

  it("drops other bullet styles, so an item never shows two bullets", () => {
    render(<SpecialtyList specialty={"- Russian Manicure\n* BIAB\n1. Nail Art\n· Soft Gel Tips"} />);
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Russian Manicure", "BIAB", "Nail Art", "Soft Gel Tips"]);
  });

  it("keeps a repeated item without React warnings about keys", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<SpecialtyList specialty="• Nail Art • Gel • Nail Art" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it("keeps a hyphenated name whole", () => {
    render(<SpecialtyList specialty="• Long-lasting gel" />);
    expect(screen.getByRole("listitem")).toHaveTextContent("Long-lasting gel");
  });

  it("draws nothing for an empty specialty", () => {
    const { container } = render(<SpecialtyList specialty=" • " />);
    expect(container).toBeEmptyDOMElement();
  });
});
