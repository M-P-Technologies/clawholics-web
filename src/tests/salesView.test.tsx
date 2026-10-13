import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SalesView from "@/components/admin/dashboard/SalesView";
import { dashboardData as data } from "./dashboardFixture";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

describe("SalesView", () => {
  it("shows the money cards first, then what sold and how bookings ended, then the sales record", () => {
    render(<SalesView data={data} />);
    const money = screen.getByRole("region", { name: "Money" });
    const top = screen.getByRole("region", { name: "Top services" });
    const ended = screen.getByRole("region", { name: "How bookings ended" });
    const record = screen.getByRole("region", { name: "Sales record" });
    expect(money.compareDocumentPosition(top) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(top.compareDocumentPosition(ended) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(ended.compareDocumentPosition(record) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(money).getAllByRole("group")).toHaveLength(4);
  });

  it("says when the numbers couldn't be refreshed", () => {
    render(<SalesView data={data} failed />);
    expect(screen.getByRole("alert")).toHaveTextContent("couldn't refresh");
  });
});
