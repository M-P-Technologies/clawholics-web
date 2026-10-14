import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ClientHome from "@/views/client/ClientHome";

const navigate = vi.fn();
vi.mock("@/lib/router", () => ({
  useNavigate: () => navigate,
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
vi.mock("@/hooks/useServicePhotos", () => ({ useServicePhotos: () => () => "" }));
const services = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1, name: `Service ${i + 1}`, description: "Nice set", pricing_type: "flat", price: 500 + i, master_price: 0, junior_price: 0, image: "", variants: [], category: "Nails",
}));
let home: Record<string, string> = {};
vi.mock("@/services/serviceService", () => ({ fetchServices: () => Promise.resolve(services) }));
vi.mock("@/services/contentService", () => ({ fetchHomeContent: () => Promise.resolve(home) }));
let account: Record<string, unknown>;
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => account }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-14T08:00:00+08:00"));
  home = {};
  navigate.mockReset();
  account = {
    dbUser: { first_name: "Ana", dob: "1998-03-02" }, clerkUser: { firstName: "Ana" },
    nextAppointment: null, currentTime: Date.now(), stamps: 3,
    payForAppointment: vi.fn(), rescheduleAppointment: vi.fn(), startCancel: vi.fn(), openRewards: vi.fn(), openAppointment: vi.fn(),
  };
});
afterEach(() => vi.useRealTimers());

describe("ClientHome", () => {
  it("greets the client and searches in Explore", () => {
    render(<ClientHome />);
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("heading", { level: 1, name: "Hi, Ana" }));
    // The app's top bar, not a page header of its own
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("link", { name: /View site/ }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search services" }), { target: { value: "gel x" } });
    fireEvent.submit(screen.getByRole("search"));
    expect(navigate).toHaveBeenCalledWith("/my/explore?q=gel%20x");
  });

  it("shows the first eight services in their admin order", async () => {
    render(<ClientHome />);
    await waitFor(() => expect(screen.getByText("Service 1")).toBeInTheDocument());
    expect(screen.getByText("Service 8")).toBeInTheDocument();
    expect(screen.queryByText("Service 9")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Service 1/ })).toHaveAttribute("href", "/my/explore/1");
  });

  it("leaves Special offers out when there are none", async () => {
    render(<ClientHome />);
    await waitFor(() => expect(screen.getByText("Service 1")).toBeInTheDocument());
    expect(screen.queryByRole("heading", { name: "Special offers" })).not.toBeInTheDocument();
  });

  it("shows the birthday banner in the client's birthday month", async () => {
    account = { ...account, dbUser: { first_name: "Ana", dob: "1998-10-25" } };
    render(<ClientHome />);
    expect(await screen.findByRole("heading", { name: "Special offers" })).toBeInTheDocument();
    expect(screen.getByText("Happy birthday, Ana!")).toBeInTheDocument();
  });

  it("shows the admin's offers", async () => {
    home = { home_offers: JSON.stringify([{ title: "20% off", line: "On gel", note: "", image: "", buttonLabel: "Grab it", link: "/my/explore/2" }]) };
    render(<ClientHome />);
    expect(await screen.findByText("20% off")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Grab it" })).toHaveAttribute("href", "/my/explore/2");
  });

  it("offers a booking from the empty upcoming card", () => {
    render(<ClientHome />);
    expect(screen.getByText("You have no upcoming appointments.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book now" })).toHaveAttribute("href", "/my/explore");
  });
});
