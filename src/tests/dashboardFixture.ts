// A sample dashboard document for the view tests (not a test file itself)
import type { DashboardResponse } from "@/services/dashboardTypes";

export const dashboardData: DashboardResponse = {
  range: "month",
  period: { from: "2026-10-01", to: "2026-10-31" },
  previous: { from: "2026-09-01", to: "2026-09-30" },
  rates: {
    cancellation: { value: 0.2, previous: 0.05 }, conversion: { value: 0.9, previous: 0.9 },
    returning: { value: 0.4, previous: 0.4 }, leadConversion: { value: 0.5, previous: 0.5 },
  },
  lapsedClients: 2, leads: { accounts: 4, booked: 2 }, totals: { clients: { value: 17, previous: 15 }, services: { value: 8, previous: 10 }, artists: { value: 5, previous: 5 }, appointments: { value: 6, previous: 4 }, trend: [] }, sales: [],
  attention: { today: 0, proofsToReview: 1, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 },
  money: { grossReceipts: { value: 0, previous: 0 }, unearned: { value: 0, previous: 0 }, revenue: { value: 0, previous: 0 }, otherIncome: { value: 0, previous: 0 }, refunds: { value: 0, previous: 0 }, points: [] },
  trend: {
    granularity: "day",
    points: [
      { date: "2026-10-12", bookings: 1 },
      { date: "2026-10-13", bookings: 3 },
      { date: "2026-10-14", bookings: 2 },
    ],
  },
  rateTrend: [
    { date: "2026-10-12", cancellation: 0.1, conversion: null, leadConversion: 0.25, returning: 0 },
    { date: "2026-10-13", cancellation: 0.15, conversion: 0.8, leadConversion: 0.5, returning: 0.25 },
    { date: "2026-10-14", cancellation: 0.2, conversion: 0.9, leadConversion: 0.5, returning: 0.4 },
  ],
  bookingsTrend: { granularity: "week", points: ["2026-10-01", "2026-10-08"].map((date) => ({ date, completed: 5, cancelled: 0 })) },
  services: [], weekdays: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: 2 })),
  artists: [], overview: { services: [], weekdays: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: 2 })), artists: [], decided: 10, cancellation: 0.1, conversion: 0.9, returningClients: 0, loyaltyRedeemed: 0 }, outcomes: { confirmed: 0, completed: 0, pending: 0, cancelled: 0, refunded: 0 }, next: [],
};
