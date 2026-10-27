import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CarouselEditor from "@/components/features/admin/cms/CarouselEditor";

const choices = [
  { id: 1, url: "https://img/nailists/a.webp", artist: "Miss Jean" },
  { id: 2, url: "https://img/nailists/b.webp", artist: "Miss Farah" },
];

describe("studio gallery editor", () => {
  it("has no upload, and adds a chosen artist photo", () => {
    const onChange = vi.fn();
    const { container } = render(<CarouselEditor photos={[]} onChange={onChange} choices={choices} />);
    expect(container.querySelector("input[type=file]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Add a\.webp by Miss Jean/ }));
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ image_url: "https://img/nailists/a.webp", position: 1 })]);
  });

  it("doesn't offer a photo that is already in the gallery", () => {
    render(<CarouselEditor photos={[{ id: 9, image_url: choices[0].url, position: 1 }]} onChange={() => {}} choices={choices} />);
    expect(screen.queryByRole("button", { name: /Add a\.webp/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Add b\.webp by Miss Farah/ })).toBeInTheDocument();
  });
});
