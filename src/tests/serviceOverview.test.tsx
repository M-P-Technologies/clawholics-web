import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ServiceOverview from "@/features/booking/components/ServiceOverview";

const service = {
  name: "Softgel Extensions", category: "Manicure", description: "Lightweight, flexible nail extensions.",
  duration: "2 hrs", pricing_type: "tiered" as const, master_price: 800, junior_price: 650,
};
const priceLines = [
  { id: "master", label: "Master technician: starts at ", amount: "800.00" },
  { id: "junior", label: "Junior technician: starts at ", amount: "650.00" },
];

describe("ServiceOverview (phone layout)", () => {
  it("shows the name with the starting price, and three quick facts", () => {
    render(<ServiceOverview service={service} priceLines={priceLines} />);
    expect(screen.getByRole("heading", { level: 1, name: "Softgel Extensions" })).toBeInTheDocument();
    expect(screen.getByText("₱650")).toBeInTheDocument(); // the lower of the two rates
    expect(screen.getByText("2 hrs")).toBeInTheDocument();
    expect(screen.getByText("Duration")).toBeInTheDocument();
    expect(screen.getByText("Booking deposit")).toBeInTheDocument();
    expect(screen.getByText("Deductible")).toBeInTheDocument();
  });

  it("puts the description under 'About this service', then the full pricing and deposit", () => {
    render(<ServiceOverview service={service} priceLines={priceLines} />);
    expect(screen.getByRole("heading", { name: "About this service" }).nextElementSibling).toHaveTextContent("Lightweight, flexible nail extensions.");
    expect(screen.getByText(/Master technician: starts at/)).toBeInTheDocument();
    expect(screen.getByText(/Junior technician: starts at/)).toBeInTheDocument();
    expect(screen.getByText(/₱100 is a non-refundable reservation fee/)).toBeInTheDocument();
  });

  it("leaves out the starting price when there isn't one", () => {
    render(<ServiceOverview service={{ ...service, master_price: 0, junior_price: 0 }} priceLines={[]} />);
    expect(screen.queryByText("Starts at")).toBeNull();
  });
});

describe("ServiceOverview text sizes", () => {
  it("uses one size for the description, the prices and the deposit text", () => {
    const { container } = render(<ServiceOverview service={service} priceLines={priceLines} />);
    const body = [
      ...container.querySelectorAll("p, ul"),
    ].filter((el) => /Lightweight|starts at|Final fees|To secure your slot|deductible|non-refundable/.test(el.textContent ?? ""));
    expect(body.length).toBeGreaterThanOrEqual(5);
    // each carries the shared size itself (a wrapper's size wouldn't reach a <p>)
    for (const el of body) expect(el).toHaveClass("text-base");
  });
});
