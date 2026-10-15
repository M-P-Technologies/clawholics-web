import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Explore from "@/views/client/Explore";
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
vi.mock("@/services/serviceService", () => ({ fetchServices: () => Promise.resolve(services) }));
vi.mock("@/services/catalogService", () => ({ fetchCategories: () => Promise.resolve([{ id: 1, name: "Nails" }, { id: 2, name: "Lashes" }]) }));
vi.mock("@/services/contentService", () => ({ fetchHomeContent: () => Promise.resolve({}) }));
// Phone layout (cards) unless a case asks for the table
const layout = { table: false };
vi.mock("@/hooks/useMinWidth", () => ({ useTableLayout: () => layout.table }));
vi.mock("@/hooks/client/useMyAccount", () => ({ useMyAccount: () => ({ dbUser: { first_name: "Ana" }, clerkUser: null }) }));

beforeEach(() => {
  search = "";
  startBooking.mockReset();
  layout.table = false;
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
  it("lists every service with the editable subtitle", async () => {
    render(<Explore />);
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("heading", { level: 1, name: "Our services" }));
    // The app's top bar, not a page header of its own
    expect(screen.getByRole("banner")).toContainElement(screen.getByRole("link", { name: /View site/ }));
    expect(screen.getByText("Find the perfect service for you")).toBeInTheDocument();
    expect(await screen.findAllByRole("listitem")).toHaveLength(3);
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

  it("books from a row, and opens the service from its name", async () => {
    render(<Explore />);
    const rows = await screen.findAllByRole("listitem");
    fireEvent.click(within(rows[0]).getByRole("button", { name: "Book Gel manicure" }));
    expect(startBooking).toHaveBeenCalledWith(services[0]);
    expect(within(rows[0]).getByRole("link", { name: /Gel manicure/ })).toHaveAttribute("href", "/my/explore/1");
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
