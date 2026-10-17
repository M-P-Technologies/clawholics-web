// A sample dashboard document for the view tests (not a test file itself)
import type { DashboardResponse } from "@/services/dashboardTypes";

export const dashboardData: DashboardResponse = {
  range: "month",
  period: { from: "2026-10-01", to: "2026-10-31" },
  previous: { from: "2026-09-01", to: "2026-09-30" },
  kpis: {
    collected: { value: 2000, previous: 1000 }, estimatedSales: { value: 3100, previous: 3000 },
    bookings: { value: 12, previous: 10 }, newClients: { value: 2, previous: 2 }, recurringClients: { value: 4, previous: 3 },
  },
  rates: {
    cancellation: { value: 0.2, previous: 0.05 }, conversion: { value: 0.9, previous: 0.9 },
    returning: { value: 0.4, previous: 0.4 }, averageSale: { value: 1000, previous: 1000 }, leadConversion: { value: 0.5, previous: 0.5 },
  },
  lapsedClients: 2, leads: { accounts: 4, booked: 2 }, clientBase: { clients: 5, lifetimeValue: 1120, churn: 0.4 }, totals: { clients: 17, services: 35, artists: 5, noShows: 0, trend: [] }, sales: [],
  loyalty: { stamps: 0, redeemed: 0 },
  attention: { today: 0, proofsToReview: 1, toConfirm: 0, toComplete: 0, photosToAdd: 0, unpaid: 0, warmLeads: 0 },
  money: { balanceAtSalon: { value: 0, previous: 0 }, returningRevenue: { value: 0, previous: 0 }, lostToCancellations: { value: 0, previous: 0 }, bookedAhead: { value: 0, previous: 0, visits: 0, granularity: "day", days: [] } },
  trend: {
    granularity: "day",
    points: [
      { date: "2026-10-12", collected: 0, estimatedSales: 0, bookings: 1, newClients: 0, recurringClients: 3, balanceAtSalon: 0, returningRevenue: 0, lost: 0 },
      { date: "2026-10-13", collected: 300, estimatedSales: 500, bookings: 3, newClients: 1, recurringClients: 3, balanceAtSalon: 0, returningRevenue: 0, lost: 0 },
      { date: "2026-10-14", collected: 500, estimatedSales: 800, bookings: 2, newClients: 1, recurringClients: 4, balanceAtSalon: 0, returningRevenue: 0, lost: 0 },
    ],
  },
  monthly: ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].map((month) => ({ month, completed: 5, cancelled: 0 })),
  services: [], weekdays: [1, 2, 3, 4, 5, 6, 7].map((weekday) => ({ weekday, bookings: 2 })),
  artists: [], outcomes: { confirmed: 0, completed: 0, pending: 0, cancelled: 0, refunded: 0 }, next: [],
};
