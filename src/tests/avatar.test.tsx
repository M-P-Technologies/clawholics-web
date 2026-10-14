import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar, initialsOf } from "@/components/atoms";

describe("Avatar", () => {
  it("shows the photo, named", () => {
    render(<Avatar name="Ana Cruz" imageUrl="https://img/a.png" />);
    const img = screen.getByRole("img", { name: "Ana Cruz" });
    expect(img.tagName).toBe("IMG");
    expect(img).toHaveAttribute("src", "https://img/a.png");
  });
  it("shows initials without a photo", () => {
    render(<Avatar name="Ana Maria Cruz" />);
    expect(screen.getByRole("img", { name: "Ana Maria Cruz" })).toHaveTextContent("AM");
  });
  it("shows a question mark, still named, with no name and no photo", () => {
    render(<Avatar name="" />);
    expect(screen.getByRole("img", { name: "Unknown" })).toHaveTextContent("?");
  });
  it("hides itself from screen readers when decorative", () => {
    const { container } = render(<Avatar name="Ana" decorative />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
  it("has sizes", () => {
    const { container } = render(<Avatar name="Ana" size="xl" />);
    expect((container.firstChild as HTMLElement).className).toContain("h-16");
  });
  it("makes initials from up to two words", () => {
    expect(initialsOf("ana maria cruz")).toBe("AM");
    expect(initialsOf("  ")).toBe("");
  });
});
