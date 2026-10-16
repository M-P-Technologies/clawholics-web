import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ServicesTable from "@/components/features/client/explore/ServicesTable";
import type { NailService } from "@/services/serviceService";

const layout = { table: true };
vi.mock("@/hooks/useMinWidth", () => ({ useTableLayout: () => layout.table }));
vi.mock("@/lib/router", () => ({ Link: ({ to, children, ...r }: { to: string; children: React.ReactNode }) => <a href={to} {...r}>{children}</a> }));

const services = [
  { id: 1, name: "Hard Gel", description: "Strong and glossy", image: "https://img/hg.webp", pricing_type: "flat", price: 650 },
  { id: 2, name: "Gel Pedicure", description: "", image: "", pricing_type: "flat", price: 450 },
] as unknown as NailService[];

describe("ServicesTable", () => {
  it("is a table on a computer: the name is plain text, Book books it, with the price", () => {
    layout.table = true;
    const onBook = vi.fn();
    render(<ServicesTable label="Services" services={services} onBook={onBook} />);
    const table = screen.getByRole("table", { name: "Services" });
    expect(within(table).getByText("Hard Gel")).toBeInTheDocument();
    expect(within(table).queryByRole("link")).toBeNull();
    expect(within(table).queryByRole("button", { name: "Hard Gel" })).toBeNull();
    expect(table).toHaveTextContent("₱650");
    fireEvent.click(within(table).getByRole("button", { name: "Book Hard Gel" }));
    expect(onBook).toHaveBeenCalledWith(services[0]);
  });

  it("is cards on a phone, with a placeholder for a service without a photo and no empty description", () => {
    layout.table = false;
    render(<ServicesTable label="Services" services={services} onBook={vi.fn()} />);
    const list = screen.getByRole("list", { name: "Services" });
    const cards = within(list).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    expect(within(cards[1]).getByTestId("no-photo")).toBeInTheDocument();
    expect(cards[1].querySelector("[data-description]")).toBeNull();
    expect(cards[0].querySelector("[data-description]")).toHaveTextContent("Strong and glossy");
    expect(within(cards[0]).getByRole("button", { name: "Book Hard Gel" })).toBeInTheDocument();
  });

  it("shows ten rows a page on a computer, and starts a new list on page 1", () => {
    layout.table = true;
    const many = Array.from({ length: 12 }, (_, i) => ({ ...services[0], id: 100 + i, name: `Service ${i + 1}` }));
    const { rerender } = render(<ServicesTable label="Services" services={many} onBook={vi.fn()} paginateTable />);
    const table = screen.getByRole("table", { name: "Services" });
    // The header row plus ten service rows
    expect(within(table).getAllByRole("row")).toHaveLength(11);
    expect(within(table).getByText("Service 10")).toBeInTheDocument();
    expect(within(table).queryByText("Service 11")).toBeNull();
    expect(screen.getByText("Showing 1–10 of 12")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /page 2/i }));
    // Two services, and eight hidden filler rows keeping the ten-row height (as in the Admin Directory)
    expect(within(table).getAllByRole("row").filter((row) => !row.hasAttribute("data-filler"))).toHaveLength(3);
    expect(table.querySelectorAll("tr[data-filler]")).toHaveLength(8);
    expect(within(table).getByText("Service 12")).toBeInTheDocument();
    expect(screen.getByText("Showing 11–12 of 12")).toBeInTheDocument();

    // A different list (a new search) starts on page 1 again
    rerender(<ServicesTable label="Services" services={many.slice(0, 11)} onBook={vi.fn()} paginateTable />);
    expect(within(screen.getByRole("table", { name: "Services" })).getByText("Service 1")).toBeInTheDocument();
  });

  it("shows every row in the table unless asked to page it (Home's short list)", () => {
    layout.table = true;
    const many = Array.from({ length: 8 }, (_, i) => ({ ...services[0], id: 200 + i, name: `Service ${i + 1}` }));
    render(<ServicesTable label="Services" services={many} onBook={vi.fn()} />);
    expect(within(screen.getByRole("table", { name: "Services" })).getAllByRole("row")).toHaveLength(9);
    expect(screen.queryByRole("button", { name: /page 2/i })).toBeNull();
  });

  it("shows five cards a page on a phone", () => {
    layout.table = false;
    const many = Array.from({ length: 7 }, (_, i) => ({ ...services[0], id: i + 1, name: `Service ${i + 1}` })) as NailService[];
    render(<ServicesTable label="Services" services={many} onBook={vi.fn()} />);
    expect(within(screen.getByRole("list", { name: "Services" })).getAllByRole("listitem")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(within(screen.getByRole("list", { name: "Services" })).getAllByRole("listitem")).toHaveLength(2);
  });

  it("goes back to the first page when the list changes (a new search)", () => {
    layout.table = false;
    const many = Array.from({ length: 12 }, (_, i) => ({ ...services[0], id: i + 1, name: `Service ${i + 1}` })) as NailService[];
    const { rerender } = render(<ServicesTable label="Services" services={many} onBook={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Service 11")).toBeInTheDocument();
    rerender(<ServicesTable label="Services" services={many.slice(2, 10)} onBook={vi.fn()} />);
    expect(screen.getByText("Service 3")).toBeInTheDocument();
    expect(screen.queryByText("Service 8")).toBeNull();
  });

  it("keeps the page when the same list is drawn again", () => {
    layout.table = false;
    const many = Array.from({ length: 7 }, (_, i) => ({ ...services[0], id: i + 1, name: `Service ${i + 1}` })) as NailService[];
    const { rerender } = render(<ServicesTable label="Services" services={many} onBook={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    rerender(<ServicesTable label="Services" services={[...many]} onBook={vi.fn()} />);
    expect(screen.getByText("Service 6")).toBeInTheDocument();
  });
});
