import type { DashboardRange } from "../lib/dashboardPeriods";
import type { Granularity, Trend } from "../lib/dashboardTrend";

type Change = { value: number; previous: number };
// A fraction (0..1) or an amount; null means there was nothing to divide by
type Rate = { value: number | null; previous: number | null };

/** One point of the money cards' lines (a trend bucket); see Money */
export interface MoneyPoint {
  date: string;
  grossReceipts: number;
  unearned: number;
  revenue: number;
  otherIncome: number;
  refunds: number;
}

/** The period's money for the salon's financial statements, from the paid downpayments (dated by
 *  when they were paid, refunded, or forfeited by a cancellation or no-show) and the visits
 *  completed with the booking tracker (their balances and late fees, by the day completed). */
export interface Money {
  /** Money in: downpayments paid, plus balances paid at the salon, less refunds */
  grossReceipts: Change;
  /** Downpayments held at the period's end (today at the latest) for visits not done yet: a liability */
  unearned: Change;
  /** What the salon earned: the downpayments and balances (late fees included) of the visits
   * completed, plus the downpayments kept from cancellations and no-shows */
  revenue: Change;
  /** Downpayments kept from cancellations and no-shows, plus late fees */
  otherIncome: Change;
  /** Downpayments returned to clients (taken off Gross income; no card of its own) */
  refunds: Change;
  /** A point per trend bucket (unearned as of its last day) */
  points: MoneyPoint[];
}

export interface DashboardResponse {
  range: DashboardRange;
  period: { from: string; to: string };
  previous: { from: string; to: string };
  /** leadConversion: client accounts made in the period that went on to book (confirmed or completed) */
  rates: { cancellation: Rate; conversion: Rate; returning: Rate; leadConversion: Rate };
  /** Clients whose last visit completed with the booking tracker was completed over 60 days ago */
  lapsedClients: number;
  /** The period's new client accounts, and how many of them went on to book (lead conversion's parts) */
  leads: { accounts: number; booked: number };
  /** The Dashboard's glance cards, for the period against the one before: client accounts with a
   * visit completed with the booking tracker in it, the different services and artists booked in it
   * (confirmed or completed; from TRACKER_FROM only once completed with the tracker), and the visits
   * completed with the tracker in it, one each */
  totals: {
    clients: Change;
    services: Change;
    artists: Change;
    appointments: Change;
    /** For the cards' lines, on the same days (or weeks, or months) as `trend`: the same counts within each */
    trend: { date: string; clients: number; services: number; artists: number; appointments: number }[];
  };
  /** Every visit completed with the booking tracker in the period, latest completed first. date:
   * the visit's day; fee: what it sold for (downpayment + recorded balance); user_id: null for a walk-in */
  sales: { id: number; date: string; time: string; client_name: string; user_id: number | null; service_name: string; nailist_name: string; fee: number | null }[];
  /** warmLeads: clients active in the last 60 days who haven't booked a visit (see /leads) */
  attention: { today: number; proofsToReview: number; /** Paid online, waiting for an admin to confirm */ toConfirm: number; /** Confirmed visits that are over, waiting to be completed */ toComplete: number; /** Completed visits without nail photos yet */ photosToAdd: number; unpaid: number; warmLeads: number };
  money: Money;
  /** One point per day, week or month of the period (up to today), for the lines on the stat cards */
  trend: Trend;
  /** The rate cards' lines, on the same days (or weeks, or months) as `trend`: each rate so far in
   * the period, from its first day to the point's last day (null with nothing to divide by) */
  rateTrend: { date: string; cancellation: number | null; conversion: number | null; leadConversion: number | null; returning: number | null }[];
  /** The Dashboard's bookings chart, a bar pair per day (a week), week (up to three months) or month
   * (a year, all time) of the period up to today: visits completed (from TRACKER_FROM only with the
   * tracker) and cancelled, refunded or no-show */
  bookingsTrend: { granularity: Granularity; points: { date: string; completed: number; cancelled: number }[] };
  /** The period's services by bookings, five rows at most: with more, the top four and "Other" */
  services: { name: string; bookings: number; estimatedSales: number }[];
  weekdays: { weekday: number; bookings: number }[];
  artists: { name: string; bookings: number }[];
  /** The Dashboard's Service mix and Salon notes, for the period: services, weekdays and artists by
   *  bookings (confirmed or completed; from TRACKER_FROM only once completed with the tracker); the
   *  share of decided visits cancelled, refunded or no-shows (of `decided`); the share of clients'
   *  bookings that were paid; clients with two or more visits done with the tracker by the period's
   *  end; loyalty rewards redeemed in it */
  overview: {
    services: { name: string; bookings: number; estimatedSales: number }[];
    weekdays: { weekday: number; bookings: number }[];
    artists: { name: string; bookings: number }[];
    decided: number;
    cancellation: number | null;
    conversion: number | null;
    returningClients: number;
    loyaltyRedeemed: number;
  };
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
