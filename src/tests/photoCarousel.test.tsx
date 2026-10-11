import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
