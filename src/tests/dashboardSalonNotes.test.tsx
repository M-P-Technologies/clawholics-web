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
  rates: {
    cancellation: { value: 0.05, previous: 0.05 }, conversion: { value: 0.9, previous: 0.9 },
    returning: { value: 0.4, previous: 0.4 }, leadConversion: { value: 0.5, previous: 0.5 },
  },
  lapsedClients: 0, leads: { accounts: 4, booked: 2 }, totals: { clients: { value: 17, previous: 15 }, services: { value: 8, previous: 10 }, artists: { value: 5, previous: 5 }, appointments: { value: 6, previous: 4 }, trend: [] }, sales: [],
  attention: { today: 0, proofsToReview: 0, toConfirm: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 },
  money: { grossReceipts: { value: 0, previous: 0 }, unearned: { value: 0, previous: 0 }, revenue: { value: 0, previous: 0 }, otherIncome: { value: 0, previous: 0 }, refunds: { value: 0, previous: 0 }, points: [] },
  trend: { granularity: "day", points: [] },
  rateTrend: [],
  bookingsTrend: { granularity: "week", points: ["2026-10-01", "2026-10-08"].map((date) => ({ date, completed: 5, cancelled: 0 })) },
  services: [], weekdays: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: 2 })),
  artists: [], overview: { services: [], weekdays: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: 2 })), artists: [], decided: 10, cancellation: 0.1, conversion: 0.9, returningClients: 0, loyaltyRedeemed: 0 }, outcomes: { confirmed: 0, completed: 0, pending: 0, cancelled: 0, refunded: 0 }, next: [],
  ...over,
});

describe("SalonNotes", () => {
  it("is one card about the chosen period, named under its heading", () => {
    render(<SalonNotes data={base()} />);
    const notes = within(screen.getByRole("region", { name: "Salon notes" }));
    expect(notes.getByText("This month")).toBeInTheDocument();
  });

  it("names All time when that's the period", () => {
    render(<SalonNotes data={base({ range: "all" })} />);
    expect(within(screen.getByRole("region", { name: "Salon notes" })).getByText("All time")).toBeInTheDocument();
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
    render(<SalonNotes data={base({ overview: { ...base().overview, cancellation: 0.3 } })} />);
    expect(screen.queryByRole("region", { name: "Wins" })).toBeNull();
    expect(within(screen.getByRole("region", { name: "Watch-outs" })).getByText("30% of bookings were cancelled, refunded or no-shows.")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Try this" })).getByText("Send clients a reminder the day before to cut cancellations.")).toBeInTheDocument();
  });

  it("never compares with a previous period", () => {
    render(<SalonNotes data={base({ totals: { ...base().totals, appointments: { value: 5, previous: 10 } } })} />);
    expect(screen.queryByText(/Collected is down/)).toBeNull();
    expect(screen.queryByText(/collected this month/)).toBeNull();
  });

  it("links a suggestion to the screen where it can be done", () => {
    render(<SalonNotes data={base({ lapsedClients: 2 })} />);
    expect(within(screen.getByRole("region", { name: "Try this" })).getByRole("link", { name: "Open clients" })).toHaveAttribute("href", "/clients#clients");
  });

  it("says when all is steady, or there is too little to judge", () => {
    const { unmount } = render(<SalonNotes data={base()} />);
    expect(screen.getByText("Steady: nothing needs attention.")).toBeInTheDocument();
    unmount();
    render(<SalonNotes data={base({ overview: { ...base().overview, decided: 1 } })} />);
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
