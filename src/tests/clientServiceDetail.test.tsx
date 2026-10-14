import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServiceDetail from "@/views/client/ServiceDetail";

const navigate = vi.fn();
vi.mock("@/lib/router", () => ({
  useNavigate: () => navigate,
  useParams: () => ({ id: "7" }),
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
const startBooking = vi.fn();
vi.mock("@/hooks/useStartBooking", () => ({ useStartBooking: () => startBooking }));
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show: vi.fn() }) }));
const service = {
  id: 7, name: "Softgel extensions", description: "Long-wear extensions in your shape.", category: "Nails", image: "https://x/7.jpg",
  pricing_type: "tiered", master_price: 1200, junior_price: 900, price: 0, duration: "2 hrs", variants: [],
};
let byId: () => Promise<unknown>;
vi.mock("@/services/serviceService", () => ({
  fetchServiceById: () => byId(),
  fetchServiceGallery: () => Promise.resolve([{ id: 1, image_url: "https://x/g1.jpg" }]),
}));

beforeEach(() => {
  byId = () => Promise.resolve(service);
  startBooking.mockReset();
  navigate.mockReset();
});

describe("ServiceDetail", () => {
  it("shows the service, its price range and facts", async () => {
    const { container } = render(<ServiceDetail />);
    expect(await screen.findByRole("heading", { name: "Softgel extensions" })).toBeInTheDocument();
    expect(screen.getByText("₱900 – ₱1,200")).toBeInTheDocument();
    expect(screen.getByText("2 hrs")).toBeInTheDocument();
    expect(screen.getByText("Master & Junior")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Long-wear extensions in your shape.")).toBeInTheDocument();
    // alt="" photos are decorative, so they have no img role: count the elements
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });

  it("books the service", async () => {
    render(<ServiceDetail />);
    fireEvent.click(await screen.findByRole("button", { name: "Book now" }));
    expect(startBooking).toHaveBeenCalledWith(service);
  });

  it("says when the service no longer exists", async () => {
    // serviceService throws this for a 404
    byId = () => Promise.reject(new Error("Service not found"));
    render(<ServiceDetail />);
    expect(await screen.findByText("This service isn't available any more.")).toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    byId = () => Promise.reject(new Error("Failed to fetch service"));
    render(<ServiceDetail />);
    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("goes back to Explore", async () => {
    render(<ServiceDetail />);
    await screen.findByRole("heading", { name: "Softgel extensions" });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(navigate).toHaveBeenCalledWith("/my/explore");
  });
});
