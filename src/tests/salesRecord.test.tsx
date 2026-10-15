import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SalesRecord from "@/features/dashboard/components/SalesRecord";
import type { DashboardResponse } from "@/features/dashboard/types";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

type Sale = DashboardResponse["sales"][number];
const sale = (id: number, over: Partial<Sale> = {}): Sale => ({
  id, date: "2026-10-08", time: "10:00-11:00", client_name: `Client ${id}`, user_id: 100 + id,
  service_name: "Gel", nailist_name: "Maxine", fee: 800, ...over,
});

describe("SalesRecord", () => {
  it("lists each completed visit with its service, customer and fee, and the total", () => {
    render(<SalesRecord sales={[sale(1), sale(2, { service_name: "Nail Art", fee: 300, client_name: "Cara C", nailist_name: "Jun" })]} />);
    const card = within(screen.getByRole("region", { name: "Sales record" }));
    expect(card.getByText("₱1,100 from 2 visits")).toBeInTheDocument();
    const row = within(card.getByRole("row", { name: /Cara C/ }));
    expect(row.getByText("Nail Art")).toBeInTheDocument();
    expect(row.getByText("Jun")).toBeInTheDocument();
    expect(row.getByText("Oct 8, 2026")).toBeInTheDocument();
    expect(row.getByText("₱300")).toBeInTheDocument();
    expect(row.getByRole("link", { name: "Cara C" })).toHaveAttribute("href", "/clients/102");
  });

  it("shows a walk-in without a link, and a missing fee as a dash", () => {
    render(<SalesRecord sales={[sale(1, { client_name: "Walk In", user_id: null, fee: null })]} />);
    const row = within(screen.getByRole("row", { name: /Walk In/ }));
    expect(row.queryByRole("link")).toBeNull();
    expect(row.getByText("–")).toBeInTheDocument();
    expect(screen.getByText("₱0 from 1 visit")).toBeInTheDocument();
  });

  it("pages through ten at a time", () => {
    render(<SalesRecord sales={Array.from({ length: 13 }, (_, i) => sale(i + 1))} />);
    expect(screen.getAllByRole("row")).toHaveLength(11);
    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.getByText("Showing 11–13 of 13")).toBeInTheDocument();
  });

  it("says so when nothing was completed in the period", () => {
    render(<SalesRecord sales={[]} />);
    expect(screen.getByText("No completed visits in this period.")).toBeInTheDocument();
  });
});
