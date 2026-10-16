import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SalonNotes from "@/components/features/admin/dashboard/SalonNotes";
import type { DashboardResponse } from "@/services/dashboardTypes";

vi.mock("@/lib/router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => <a href={to} {...rest}>{children}</a>,
}));

// A steady month: nothing moved, nothing to flag
const base = (over: Partial<DashboardResponse> = {}): DashboardResponse => ({
  range: "month",
  period: { from: "2026-10-01", to: "2026-10-31" },
  previous: { from: "2026-09-01", to: "2026-09-30" },
  kpis: {
    collected: { value: 1000, previous: 1000 }, estimatedSales: { value: 3000, previous: 3000 },
    bookings: { value: 10, previous: 10 }, newClients: { value: 2, previous: 2 },
  },
  rates: {
    cancellation: { value: 0.05, previous: 0.05 }, conversion: { value: 0.9, previous: 0.9 },
    returning: { value: 0.4, previous: 0.4 }, averageSale: { value: 1000, previous: 1000 }, leadConversion: { value: 0.5, previous: 0.5 },
  },
  lapsedClients: 0, leads: { accounts: 4, booked: 2 }, clientBase: { clients: 5, lifetimeValue: 1120, churn: 0.2 }, totals: { clients: 17, services: 35, artists: 5, upcoming: 7, trend: [] }, sales: [],
  loyalty: { stamps: 0, redeemed: 0 },
  attention: { today: 0, proofsToReview: 0, toConfirm: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 },
  money: { balanceAtSalon: { value: 0, previous: 0 }, returningRevenue: { value: 0, previous: 0 }, lostToCancellations: { value: 0, previous: 0 }, bookedAhead: { value: 0, visits: 0, days: [] } },
  trend: { granularity: "day", points: [] },
  monthly: ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].map((month) => ({ month, completed: 5, cancelled: 0 })),
  services: [], weekdays: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: 2 })),
  artists: [], outcomes: { confirmed: 0, completed: 0, pending: 0, cancelled: 0, refunded: 0 }, next: [],
  ...over,
});

describe("SalonNotes", () => {
  it("is one card named for the period", () => {
    render(<SalonNotes data={base()} />);
    const notes = within(screen.getByRole("region", { name: "Salon notes" }));
    expect(notes.getByText("This month")).toBeInTheDocument();
  });

  it("lists only the things that need attention, each linked to where to do it", () => {
    render(<SalonNotes data={base({ attention: { today: 3, proofsToReview: 2, toConfirm: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 } })} />);
    const todo = within(screen.getByRole("region", { name: "Needs attention" }));
    expect(todo.getByRole("link", { name: /3.*Today's appointments/ })).toHaveAttribute("href", "/schedule");
    expect(todo.getByRole("link", { name: /2.*Proofs to review/ })).toHaveAttribute("href", "/clients?status=PROOF_PENDING");
    expect(todo.queryByRole("link", { name: /Pending/ })).toBeNull();
  });

  it("says all caught up when nothing needs attention", () => {
    render(<SalonNotes data={base()} />);
    expect(within(screen.getByRole("region", { name: "Needs attention" })).getByText("All caught up.")).toBeInTheDocument();
  });

  it("shows only the groups that have something in them", () => {
    render(<SalonNotes data={base({ rates: { ...base().rates, cancellation: { value: 0.3, previous: 0.05 } } })} />);
    expect(screen.queryByRole("region", { name: "Wins" })).toBeNull();
    expect(within(screen.getByRole("region", { name: "Watch-outs" })).getByText("30% of bookings were cancelled or refunded (up from 5%).")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Try this" })).getByText("Send clients a reminder the day before to cut cancellations.")).toBeInTheDocument();
  });

  it("does not repeat what the stat cards already show", () => {
    render(<SalonNotes data={base({ kpis: { ...base().kpis, collected: { value: 500, previous: 1000 } } })} />);
    expect(screen.queryByText(/Collected is down/)).toBeNull();
    expect(screen.queryByText(/collected this month/)).toBeNull();
  });

  it("links a suggestion to the screen where it can be done", () => {
    render(<SalonNotes data={base({ lapsedClients: 2 })} />);
    expect(within(screen.getByRole("region", { name: "Try this" })).getByRole("link", { name: "Open clients" })).toHaveAttribute("href", "/clients#clients");
  });

  it("says when the period is steady, or too quiet to compare", () => {
    const { unmount } = render(<SalonNotes data={base()} />);
    expect(screen.getByText("Steady this month: nothing needs attention.")).toBeInTheDocument();
    unmount();
    render(<SalonNotes data={base({ kpis: { ...base().kpis, bookings: { value: 1, previous: 0 } } })} />);
    expect(screen.getByText("Not enough data yet for insights.")).toBeInTheDocument();
  });

  it("does not repeat waiting proofs that Needs attention already lists", () => {
    render(<SalonNotes data={base({ attention: { today: 0, proofsToReview: 1, toConfirm: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 } })} />);
    expect(within(screen.getByRole("region", { name: "Needs attention" })).getByRole("link", { name: /1.*Proofs to review/ })).toBeInTheDocument();
    expect(screen.queryByText(/payment proof is waiting/)).toBeNull();
    expect(screen.queryByText(/Review 1 payment proof/)).toBeNull();
  });

  it("has the pink gradient only on its top part: the title and Needs attention", () => {
    render(<SalonNotes data={base({ lapsedClients: 2 })} />);
    const notes = screen.getByRole("region", { name: "Salon notes" });
    const top = screen.getByRole("region", { name: "Needs attention" }).parentElement as HTMLElement;
    expect(top.className).toContain("bg-linear-to-br");
    expect(within(top).getByRole("heading", { name: "Salon notes" })).toBeInTheDocument();
    expect(notes.className).not.toContain("bg-linear-to-br");
    expect(notes.className).toContain("bg-milk");
    expect(top.contains(screen.getByRole("region", { name: "Watch-outs" }))).toBe(false);
  });

  it("keeps its full height in the scrolling column", () => {
    render(<SalonNotes data={base()} />);
    expect(screen.getByRole("region", { name: "Salon notes" }).className).toContain("shrink-0");
  });
});

describe("SalonNotes: warm leads", () => {
  it("lists clients who haven't booked yet, linking to them in the Client Directory", () => {
    render(<SalonNotes data={base({ attention: { today: 0, proofsToReview: 0, toConfirm: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 5 } })} />);
    const todo = within(screen.getByRole("region", { name: "Needs attention" }));
    expect(todo.getByRole("link", { name: /5.*Warm leads/ })).toHaveAttribute("href", "/clients?view=leads");
  });
});

describe("visits to complete", () => {
  it("is a Needs attention row linking to the visits waiting to be completed", () => {
    render(<SalonNotes data={base({ attention: { today: 0, proofsToReview: 0, toConfirm: 0, toComplete: 2, photosToAdd: 0, unpaid: 0, warmLeads: 0 } })} />);
    const todo = within(screen.getByRole("region", { name: "Needs attention" }));
    expect(todo.getByRole("link", { name: /2.*Visits to complete/ })).toHaveAttribute("href", "/clients?status=TO_COMPLETE");
  });
});

describe("Needs attention keeps to three", () => {
  it("shows only the first three rows, in their order", () => {
    render(<SalonNotes data={base({ attention: { today: 5, proofsToReview: 0, toConfirm: 3, toComplete: 4, photosToAdd: 0, unpaid: 0, warmLeads: 146 } })} />);
    const todo = within(screen.getByRole("region", { name: "Needs attention" }));
    expect(todo.getAllByRole("link").map((l) => l.textContent?.replace(/^\d+/, ""))).toEqual(["Today's appointments", "Bookings to confirm", "Visits to complete"]);
  });
});
