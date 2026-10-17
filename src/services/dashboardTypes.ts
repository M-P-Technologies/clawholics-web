import type { DashboardRange } from "../lib/dashboardPeriods";
import type { Trend } from "../lib/dashboardTrend";

type Change = { value: number; previous: number };
// A fraction (0..1) or an amount; null means there was nothing to divide by
type Rate = { value: number | null; previous: number | null };

/** Money worked out from list prices and downpayments: nothing is entered by hand */
export interface Money {
  /** Completed visits' list price less their paid downpayments: the balance paid at the salon */
  balanceAtSalon: Change;
  /** List price of completed visits by clients who had a completed visit before the period */
  returningRevenue: Change;
  /** List price of cancelled and refunded visits */
  lostToCancellations: Change;
  /** Confirmed visits from today on, at list price (not tied to the period); days: the next 14, for its line */
  bookedAhead: { value: number; visits: number; days: { date: string; value: number; visits: number }[] };
}

export interface DashboardResponse {
  range: DashboardRange;
  period: { from: string; to: string };
  previous: { from: string; to: string };
  kpis: { collected: Change; estimatedSales: Change; bookings: Change; newClients: Change };
  /** leadConversion: client accounts made in the period that went on to book (confirmed or completed) */
  rates: { cancellation: Rate; conversion: Rate; returning: Rate; averageSale: Rate; leadConversion: Rate };
  lapsedClients: number;
  /** The period's new client accounts, and how many of them went on to book (lead conversion's parts) */
  leads: { accounts: number; booked: number };
  /** Every client with a completed visit, as of today (not the period): what an average one has
   * spent so far (list price), and the share who have lapsed (no visit in 60 days) */
  clientBase: { clients: number; lifetimeValue: number | null; churn: number | null };
  /** As of today: client accounts, active services on the menu, artists, and confirmed appointments from today on */
  totals: {
    clients: number;
    services: number;
    artists: number;
    upcoming: number;
    /** For the cards' lines, on the same days (or weeks, or months) as `trend`: client accounts at the
     * end of each, and how many different services and artists were booked in each */
    trend: { date: string; clients: number; services: number; artists: number }[];
  };
  /** Every completed visit in the period, newest first. fee: the list price for the artist's tier
   * (null for a service no longer on the menu); user_id: null for a walk-in */
  sales: { id: number; date: string; time: string; client_name: string; user_id: number | null; service_name: string; nailist_name: string; fee: number | null }[];
  loyalty: { stamps: number; redeemed: number };
  /** warmLeads: clients active in the last 60 days who haven't booked a visit (see /leads) */
  attention: { today: number; proofsToReview: number; /** Paid online, waiting for an admin to confirm */ toConfirm: number; /** Confirmed visits that are over, waiting to be completed */ toComplete: number; /** Completed visits without nail photos yet */ photosToAdd: number; unpaid: number; warmLeads: number };
  money: Money;
  /** One point per day, week or month of the period (up to today), for the lines on the stat cards */
  trend: Trend;
  monthly: { month: string; completed: number; cancelled: number }[];
  services: { name: string; bookings: number; estimatedSales: number }[];
  weekdays: { weekday: number; bookings: number }[];
  artists: { name: string; bookings: number }[];
  outcomes: { confirmed: number; completed: number; pending: number; cancelled: number; refunded: number };
  next: {
    id: number;
    client_name: string;
    service_name: string;
    nailist_name: string;
    appointment_date: string;
    appointment_time: string;
  }[];
}

/** GET /utilization: how full each artist's days were, booked of offered slots, for one Monday-to-Sunday week */
export interface UtilizationDay {
  date: string;
  /** The artist's time slots, or 0 on a day off */
  offered: number;
  /** Active appointments that day (pending, awaiting proof, confirmed or completed) */
  booked: number;
  off: boolean;
}
export interface ArtistUtilization {
  id: number;
  name: string;
  /** Their tier, e.g. "Master Technician" */
  title: string | null;
  image: string | null;
  days: UtilizationDay[];
  /** Booked of offered slots over the week (bookings beyond a day's slots don't count); null with no slots */
  rate: number | null;
}
export interface Utilization {
  week: { from: string; to: string };
  artists: ArtistUtilization[];
  /** The same, for all artists together */
  overall: number | null;
}

/** The dashboard's queue of what to act on (GET /attention) */
export type AttentionTab = "all" | "confirm" | "complete" | "leads";
export interface AttentionResponse {
  items: {
    kind: "confirm" | "review" | "complete" | "photos" | "lead";
    appointment_id: number | null;
    /** The client's users.id; null for the walk-in guest, who has no page */
    user_id: number | null;
    client_name: string;
    email: string | null;
    service_name: string | null;
    nailist_name: string | null;
    appointment_date: string | null;
    appointment_time: string | null;
    /** Waiting since (UTC "YYYY-MM-DD HH:MM:SS") */
    since: string;
    has_screenshot?: boolean;
  }[];
  counts: { confirm: number; review: number; complete: number; photos: number; leads: number };
}
