import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ServicePanel from "@/components/features/client/explore/ServicePanel";
import type { NailService } from "@/services/serviceService";

vi.mock("@/hooks/client/useServicePhotoList", () => ({
  useServicePhotoList: (service: NailService) => (service.image ? [{ id: service.image, image_url: service.image }] : []),
}));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));

const service = { id: 1, name: "Softgel Extensions", category: "Manicure", image: "https://img.test/a.webp", master_price: 800, junior_price: 650, pricing_mode: "tiered", duration: "2 hrs", description: "Long text", variants: [] } as unknown as NailService;

describe("a popular service as a card lying down", () => {
  it("shows the photo beside the category, name, price and Book, with the duration and artists as icon rows, and no description", () => {
    const onBook = vi.fn();
    const { container } = render(<ServicePanel service={service} onBook={onBook} brief row />);
    // The photo is decorative: the name is beside it
    expect(container.querySelector("img")).not.toBeNull();
    expect(screen.getByText("Manicure")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Softgel Extensions" })).toBeInTheDocument();
    expect(screen.getByText(/Duration/)).toBeInTheDocument();
    expect(screen.getByText(/2 hrs/)).toBeInTheDocument();
    expect(screen.getByText(/Artists/)).toBeInTheDocument();
    expect(screen.queryByText("Long text")).toBeNull();
    // No carousel arrows or dots: one photo
    expect(screen.queryByRole("region", { name: /photos/ })).toBeNull();
    screen.getByRole("button", { name: "Book now" }).click();
    expect(onBook).toHaveBeenCalledWith(service);
  });

  it("shows a placeholder when the service has no photo", () => {
    const { container } = render(<ServicePanel service={{ ...service, image: "" } as NailService} onBook={() => {}} brief row />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByTestId("no-photo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Book now" })).toBeInTheDocument();
  });
});

describe("a service card lying down in a list that picks (Explore)", () => {
  it("picks the service from its name, and says which is picked", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<ServicePanel service={service} onBook={() => {}} onSelect={onSelect} brief row />);
    const name = screen.getByRole("button", { name: "Softgel Extensions" });
    expect(name).toHaveAttribute("aria-pressed", "false");
    name.click();
    expect(onSelect).toHaveBeenCalledWith(service);
    rerender(<ServicePanel service={service} onBook={() => {}} onSelect={onSelect} selected brief row />);
    expect(screen.getByRole("button", { name: "Softgel Extensions" })).toHaveAttribute("aria-pressed", "true");
  });

  it("has no name button when nothing is picked from it (Home)", () => {
    render(<ServicePanel service={service} onBook={() => {}} brief row />);
    expect(screen.queryByRole("button", { name: "Softgel Extensions" })).toBeNull();
  });
});
