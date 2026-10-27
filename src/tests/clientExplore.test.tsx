import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Explore from "@/app/(client)/my/explore/page";
import { filterServices } from "@/lib/client/explore";

const navigate = vi.fn();
let search = "";
vi.mock("@/lib/router", () => ({
  useNavigate: () => navigate,
  useSearchParams: () => [new URLSearchParams(search)],
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));
const startBooking = vi.fn();
vi.mock("@/hooks/useStartBooking", () => ({ useStartBooking: () => startBooking }));
vi.mock("@/components/molecules", async (orig) => ({ ...(await orig<object>()), useToast: () => ({ show: vi.fn() }) }));
const svc = (id: number, name: string, category: string, description = "", image = "") =>
  ({ id, name, category, description, image, pricing_type: "flat", price: 500, master_price: 0, junior_price: 0, variants: [] });
const services = [svc(1, "Gel manicure", "Nails", "Glossy gel", "https://x/1.jpg"), svc(2, "Lash lift", "Lashes", "Curl"), svc(3, "Softgel extensions", "Nails", "Long wear")];
vi.mock("@/services/serviceService", () => ({
  fetchServices: () => Promise.resolve(services),
  // The panel's carousel: the main photo, then the gallery (the main photo again is shown once)
  fetchServiceGallery: (id: number) =>
    Promise.resolve(id === 1 ? [{ id: 9, service_id: 1, image_url: "https://x/1.jpg", position: 1 }, { id: 10, service_id: 1, image_url: "https://x/1b.jpg", position: 2 }] : []),
}));
vi.mock("@/services/catalogService", () => ({ fetchCategories: () => Promise.resolve([{ id: 1, name: "Nails" }, { id: 2, name: "Lashes" }]) }));
vi.mock("@/services/contentService", () => ({ fetchHomeContent: () => Promise.resolve({}) }));
// Phone layout (cards) unless a case asks for the table; the panel beside the list (lg) unless a case
// asks for the phone's sheet
const layout = { table: false, wide: true };
vi.mock("@/hooks/useMinWidth", () => ({ useTableLayout: () => layout.table, useClientWideLayout: () => layout.wide }));
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => ({ dbUser: { first_name: "Ana" }, clerkUser: null }) }));

beforeEach(() => {
  search = "";
  startBooking.mockReset();
  layout.table = false;
  layout.wide = true;
});

describe("filterServices", () => {
  it("matches name or description, ignoring case, within a category", () => {
    expect(filterServices(services as never, { q: "GEL", category: "" }).map((s) => s.id)).toEqual([1, 3]);
    expect(filterServices(services as never, { q: "curl", category: "" }).map((s) => s.id)).toEqual([2]);
    expect(filterServices(services as never, { q: "", category: "Nails" }).map((s) => s.id)).toEqual([1, 3]);
  });

  it("skips a service without a category instead of crashing", () => {
    const loose = [...services, { ...svc(4, "Mystery", ""), category: null }];
    expect(filterServices(loose as never, { q: "", category: "Nails" }).map((s) => s.id)).toEqual([1, 3]);
    expect(filterServices(loose as never, { q: "myst", category: "" }).map((s) => s.id)).toEqual([4]);
  });
});

describe("Explore", () => {
  it("shows a loading state, not \"No services match\", until the services arrive", async () => {
    search = "q=lash";
    render(<Explore />);
    expect(screen.queryByText("No services match")).toBeNull();
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
  });

  it("lists every service, with the search and category on the same card", async () => {
    render(<Explore />);
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("heading", { level: 1, name: "Our services" }));
    // The app's top bar, not a page header of its own
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("link", { name: /View site/ }));
    // No separate heading card any more: the filters sit on the list
    expect(screen.queryByText("Find the perfect service for you")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Browse services" })).toBeNull();
    const rows = await screen.findAllByRole("listitem");
    expect(rows).toHaveLength(3);
    // The search box is on the card that holds the list (a Card is rounded-2xl bg-milk)
    const card = rows[0].closest(".rounded-2xl.bg-milk");
    expect(card).not.toBeNull();
    expect(card).toContainElement(screen.getByRole("searchbox"));
    expect(card!.tagName).not.toBe("HEADER");
  });

  it("starts from the search it was opened with", async () => {
    search = "q=lash";
    render(<Explore />);
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
    expect(screen.getByRole("searchbox")).toHaveValue("lash");
  });

  it("filters by category and clears", async () => {
    render(<Explore />);
    await screen.findAllByRole("listitem");
    fireEvent.click(screen.getByRole("button", { name: "Category" }));
    fireEvent.click(await screen.findByRole("option", { name: "Lashes" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText("No services match")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("books from a row, and shows the service in the panel from its name", async () => {
    render(<Explore />);
    const rows = await screen.findAllByRole("listitem");
    fireEvent.click(within(rows[0]).getByRole("button", { name: "Book Gel manicure" }));
    expect(startBooking).toHaveBeenCalledWith(services[0]);
    // Booking from the row doesn't open anything else
    expect(within(rows[0]).queryByRole("link")).toBeNull();

    // The first service is in the panel to start with; picking another shows it there instead
    const first = screen.getByRole("complementary", { name: "Gel manicure details" });
    // Its photos are a carousel: the main photo and the gallery, the repeated main photo once
    const carousel = await within(first).findByRole("region", { name: "Gel manicure photos" });
    await vi.waitFor(() => expect(within(carousel).getAllByRole("button", { name: /Show photo/ })).toHaveLength(2));
    const second = within(rows[1]).getByRole("button", { name: services[1].name });
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-pressed", "true");
    const panel = screen.getByRole("complementary", { name: `${services[1].name} details` });
    // No link away: the panel is the details, and Book in it books that service
    expect(within(panel).queryByRole("link")).toBeNull();
    fireEvent.click(within(panel).getByRole("button", { name: "Book now" }));
    expect(startBooking).toHaveBeenLastCalledWith(services[1]);
  });

  it("opens a clicked service in a bottom sheet on a phone, where the panel is hidden", async () => {
    layout.wide = false;
    render(<Explore />);
    const rows = await screen.findAllByRole("listitem");
    // The panel beside the list is hidden below lg
    expect(screen.getByRole("complementary", { name: "Gel manicure details" }).parentElement).toHaveClass("hidden", "lg:block");
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(within(rows[1]).getByRole("button", { name: services[1].name }));
    const sheet = screen.getByRole("dialog", { name: "Service details" });
    expect(within(sheet).getByRole("complementary", { name: `${services[1].name} details` })).toBeInTheDocument();
    // Book now is the sheet's footer, below the part that scrolls
    fireEvent.click(within(sheet).getByRole("button", { name: "Book now" }));
    expect(startBooking).toHaveBeenLastCalledWith(services[1]);
    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a placeholder for a service without a photo", async () => {
    render(<Explore />);
    const rows = await screen.findAllByRole("listitem");
    expect(rows[1].querySelector("img")).toBeNull();
    expect(within(rows[1]).getByTestId("no-photo")).toBeInTheDocument();
  });

  it("lists the services as a table on a computer", async () => {
    layout.table = true;
    render(<Explore />);
    const table = await screen.findByRole("table", { name: "Services" });
    expect(within(table).getAllByRole("row")).toHaveLength(4); // the header and three services
  });
});
