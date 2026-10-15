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
  it("is a table on a computer: the name opens the service, Book books it, with the price", () => {
    layout.table = true;
    const onBook = vi.fn();
    render(<ServicesTable label="Services" services={services} onBook={onBook} />);
    const table = screen.getByRole("table", { name: "Services" });
    expect(within(table).getByRole("link", { name: /Hard Gel/ })).toHaveAttribute("href", "/my/explore/1");
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

  it("shows five cards a page on a phone", () => {
    layout.table = false;
    const many = Array.from({ length: 7 }, (_, i) => ({ ...services[0], id: i + 1, name: `Service ${i + 1}` })) as NailService[];
    render(<ServicesTable label="Services" services={many} onBook={vi.fn()} />);
    expect(within(screen.getByRole("list", { name: "Services" })).getAllByRole("listitem")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(within(screen.getByRole("list", { name: "Services" })).getAllByRole("listitem")).toHaveLength(2);
  });
});
