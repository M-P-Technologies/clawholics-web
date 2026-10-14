import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingBar } from "@/components/atoms";

describe("LoadingBar", () => {
  it("announces what is loading and shows the hint", () => {
    render(<LoadingBar label="Loading services" hint="This can take a moment" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading services…");
    expect(screen.getByText("This can take a moment")).toBeInTheDocument();
  });

  it("defaults the label to Loading", () => {
    render(<LoadingBar />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("gives each loader its own mask, so several can be on screen at once", () => {
    const { container } = render(
      <>
        <LoadingBar />
        <LoadingBar />
      </>,
    );
    const ids = [...container.querySelectorAll("mask")].map((mask) => mask.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(container.querySelector(`g[mask="url(#${id})"]`)).not.toBeNull();
    }
  });

  it("covers the whole screen with two corner blush glows by default", () => {
    const { container } = render(<LoadingBar />);
    const loader = screen.getByRole("status");
    expect(loader).toHaveClass("fixed", "inset-0");
    expect(container.querySelectorAll("[aria-hidden=true].blur-3xl")).toHaveLength(2);
  });

  it("stays in the flow of its parent, with no blush, when inline", () => {
    const { container } = render(<LoadingBar inline label="Saving" />);
    const loader = screen.getByRole("status");
    expect(loader).not.toHaveClass("fixed");
    expect(loader).toHaveTextContent("Saving…");
    expect(container.querySelector(".blur-3xl")).toBeNull();
  });
});
