import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Testimonials from "@/components/home/Testimonials";

const review = (over: object = {}) => ({
  id: 1, rating: 5, comment: "Best set yet", photo_url: "https://images.test/reviews/a.webp", created_at: "2026-10-21 02:00:00",
  service_name: "Softgel Extensions", client_name: "Ana C.", ...over,
});

describe("Testimonials", () => {
  it("shows each approved review: stars, words, photo, who and what for", () => {
    render(<Testimonials reviews={[review(), review({ id: 2, rating: 4, comment: "", photo_url: null, client_name: null, service_name: "Gel Manicure" })]} />);
    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByRole("img", { name: "5 out of 5 stars" })).toBeInTheDocument();
    expect(within(first).getByText("Best set yet")).toBeInTheDocument();
    expect(within(first).getByRole("img", { name: "Ana C.'s nails" })).toHaveAttribute("src", "https://images.test/reviews/a.webp");
    expect(first).toHaveTextContent("Ana C.");
    expect(first).toHaveTextContent("Softgel Extensions");
    // No words, photo or name: just the stars and the service
    expect(within(second).getByRole("img", { name: "4 out of 5 stars" })).toBeInTheDocument();
    expect(within(second).queryByRole("img", { name: /nails/ })).toBeNull();
    expect(second).toHaveTextContent("A happy client");
  });
});
