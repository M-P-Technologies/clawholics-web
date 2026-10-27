import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ImageCard from "@/components/home/ImageCard";

const card = (image: string) => (
  <ImageCard image={image} imageAlt="Gel Manicure sample" aspect="aspect-4/3" title="Gel Manicure" subtitle="From ₱400" description="Long-lasting gel." footer={<span>Learn more</span>} />
);

describe("ImageCard", () => {
  it("shows the photo with its alt text", () => {
    render(card("https://images.test/gel.webp"));
    expect(screen.getByRole("img", { name: "Gel Manicure sample" })).toBeInTheDocument();
  });

  it("keeps the placeholder box, not a broken image, for a service or artist with no photo", () => {
    const { container } = render(card(""));
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByRole("heading", { name: "Gel Manicure" })).toBeInTheDocument();
  });
});
