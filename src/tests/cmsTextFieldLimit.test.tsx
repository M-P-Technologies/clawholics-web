import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "@/components/features/admin/cms/fields";
import { DEFAULT_FEATURES, FEATURE_TEXT_MAX, FEATURE_TITLE_MAX } from "@/lib/homeSections";

describe("CMS text field limit", () => {
  it("stops the box at the limit and shows how many characters are used", () => {
    render(<TextField label="Description" value="Hello there" onChange={vi.fn()} rows={3} maxLength={80} />);
    const box = screen.getByLabelText("Description");
    expect(box).toHaveAttribute("maxlength", "80");
    expect(screen.getByText("11/80")).toBeInTheDocument();
    expect(box).toHaveAccessibleDescription("11/80");
  });

  it("flags a text saved before the limit that is longer than it", () => {
    render(<TextField label="Title" value={"x".repeat(30)} onChange={vi.fn()} maxLength={24} />);
    expect(screen.getByText("30/24")).toHaveClass("text-danger-ink");
  });

  it("has no limit or counter unless asked", () => {
    render(<TextField label="Heading" value="Why choose us?" onChange={vi.fn()} />);
    expect(screen.getByLabelText("Heading")).not.toHaveAttribute("maxlength");
    expect(screen.queryByText(/\/\d+$/)).toBeNull();
  });

  it("keeps the default feature cards within the limits and close in length", () => {
    for (const card of DEFAULT_FEATURES) {
      expect(card.title.length).toBeLessThanOrEqual(FEATURE_TITLE_MAX);
      expect(card.text.length).toBeLessThanOrEqual(FEATURE_TEXT_MAX);
    }
    const lengths = DEFAULT_FEATURES.map((card) => card.text.length);
    expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThanOrEqual(5);
  });
});
