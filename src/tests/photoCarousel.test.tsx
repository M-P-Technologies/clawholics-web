import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PhotoCarousel from "@/components/booking/PhotoCarousel";

const photos = [1, 2, 3].map((id) => ({ id, image_url: `https://images.clawholicsbymax.com/service-gallery/${id}.webp` }));

describe("PhotoCarousel", () => {
  it("shows every photo in a frame, with a label that says which one", () => {
    render(<PhotoCarousel photos={photos} label="Softgel Extensions" />);
    expect(screen.getByRole("region", { name: "Softgel Extensions photos" })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getByAltText("Softgel Extensions, photo 2 of 3")).toBeInTheDocument();
  });

  it("has a dot for each photo, and the first is current", () => {
    render(<PhotoCarousel photos={photos} label="x" />);
    const dots = screen.getAllByRole("button", { name: /Show photo/ });
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute("aria-current", "true");
    expect(dots[1]).toHaveAttribute("aria-current", "false");
  });

  it("follows the swipe: the dot for the photo in view becomes current", () => {
    const { container } = render(<PhotoCarousel photos={photos} label="x" />);
    const track = container.querySelector(".snap-x") as HTMLElement;
    Object.defineProperty(track, "clientWidth", { value: 300, configurable: true });
    track.scrollLeft = 300;
    fireEvent.scroll(track);
    expect(screen.getAllByRole("button", { name: /Show photo/ })[1]).toHaveAttribute("aria-current", "true");
  });

  it("shows no dots for a single photo, and nothing for none", () => {
    const { rerender, container } = render(<PhotoCarousel photos={photos.slice(0, 1)} label="x" />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    rerender(<PhotoCarousel photos={[]} label="x" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("frames photos as squares unless told otherwise, and keeps a given shape (an artist's 3:4 portrait)", () => {
    const { container, rerender } = render(<PhotoCarousel photos={photos} label="x" />);
    expect(container.querySelector(".aspect-square")).not.toBeNull();

    rerender(<PhotoCarousel photos={photos} label="x" aspect="aspect-3/4" />);
    expect(container.querySelector(".aspect-square")).toBeNull();
    expect(container.querySelectorAll(`[class~="aspect-3/4"]`)).toHaveLength(3);
  });
});

describe("PhotoCarousel arrows and fit", () => {
  const three = [1, 2, 3].map((n) => ({ id: n, image_url: `https://images.clawholicsbymax.com/${n}.webp` }));

  it("has previous and next arrows only when asked and there is more than one photo", () => {
    const { rerender } = render(<PhotoCarousel photos={three} label="Gel" />);
    expect(screen.queryByRole("button", { name: "Next photo" })).toBeNull();
    rerender(<PhotoCarousel photos={three.slice(0, 1)} label="Gel" arrows />);
    expect(screen.queryByRole("button", { name: "Next photo" })).toBeNull();
    rerender(<PhotoCarousel photos={three} label="Gel" arrows />);
    expect(screen.getByRole("button", { name: "Previous photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next photo" })).toBeInTheDocument();
  });

  it("moves one photo with Next and wraps from the first photo to the last with Previous", () => {
    const scrollTo = vi.fn();
    const original = Element.prototype.scrollTo;
    Element.prototype.scrollTo = scrollTo as unknown as typeof Element.prototype.scrollTo;
    try {
      const { container } = render(<PhotoCarousel photos={three} label="Gel" arrows />);
      const track = container.querySelector(".snap-x") as HTMLElement;
      Object.defineProperty(track, "clientWidth", { value: 300 });
      fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
      expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: "smooth" });
      fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
      expect(scrollTo).toHaveBeenLastCalledWith({ left: 600, behavior: "smooth" });
    } finally {
      Element.prototype.scrollTo = original;
    }
  });

  it("shows each whole photo with fit contain, and fills the frame by default", () => {
    const { container, rerender } = render(<PhotoCarousel photos={three} label="Gel" />);
    expect(container.querySelector("img")).toHaveClass("object-cover");
    rerender(<PhotoCarousel photos={three} label="Gel" fit="contain" />);
    expect(container.querySelector("img")).toHaveClass("object-contain");
  });
});
