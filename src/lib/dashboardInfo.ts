// The ⓘ notes on the report pages' stat cards (Dashboard, Sales, Performance): what each number
// is, and how it's counted, in the words an admin would use. Keep them in step with
// server/dashboard.ts when a number's rule changes.
interface StatInfo {
  /** What the number is, in a sentence */
  about: string;
  /** How it's counted */
  how: string;
}

export const STAT_INFO = {
  // Sales
  grossReceipts: {
    about: "All the money that came in during the period.",
    how: "Downpayments paid (on the day paid) + balances paid at the salon (on the day the visit was completed) − refunds (on the day refunded).",
  },
  unearned: {
    about: "Downpayment money held today for visits that haven't happened yet. It's the same for every period, since every period ends today.",
    how: "Every paid downpayment whose visit isn't completed, cancelled, refunded or a no-show yet. A payment that came after its booking was cancelled is held too, until refunded.",
  },
  revenue: {
    about: "What the salon earned in the period: the visits done, plus downpayments it kept. Unlike Gross income, it doesn't count downpayments for visits still to come.",
    how: "Downpayments + balances paid at the salon (late fees included) of the visits finished with Complete visit, on the day completed + downpayments kept when a client cancelled too late or didn't show up, on the day it happened.",
  },
  otherIncome: {
    about: "Money kept as penalties. It's already part of Gross income, not extra.",
    how: "Downpayments kept when a client didn't show up or cancelled too late (on the day it happened) + late fees (on the day the visit was completed).",
  },

  // Performance: the key rates
  cancellationRate: {
    about: "How many of the period's visits didn't happen.",
    how: "Cancelled, refunded and no-show visits ÷ all confirmed, completed, cancelled, refunded and no-show visits, by the visit's day.",
  },
  bookingConversion: {
    about: "How many started bookings went on to be paid and confirmed.",
    how: "Bookings clients started in the period that are now confirmed or completed ÷ all bookings they started in it.",
  },
  leadConversion: {
    about: "How many new accounts went on to book.",
    how: "Client accounts made in the period that have a confirmed or completed booking ÷ all accounts made in it.",
  },
  repeatRate: {
    about: "How many of the period's clients had come before.",
    how: "Clients with a visit done in the period who also had one done before it ÷ all clients with a visit done in it. Only visits finished with Complete visit count.",
  },
  // Dashboard: the salon at a glance
  totalClients: {
    about: "How many clients came to the salon in the period.",
    how: "Client accounts with at least one visit an admin confirmed and then finished with Complete visit on the booking tracker in the period, on the day completed (not the walk-in guest). The badge compares with the previous period; the line shows the count within each day, week or month.",
  },
  services: {
    about: "How many different services were booked in the period.",
    how: "Services of confirmed or completed bookings, on the visit's day; from 18 October 2026 only once the visit was finished with Complete visit. The badge compares with the previous period; the line shows the count within each day, week or month.",
  },
  artists: {
    about: "How many artists had bookings in the period.",
    how: "Artists of confirmed or completed bookings, on the visit's day; from 18 October 2026 only once the visit was finished with Complete visit. The badge compares with the previous period; the line shows the count within each day, week or month.",
  },
  appointments: {
    about: "How many appointments the salon did in the period.",
    how: "Every visit an admin confirmed and then finished with Complete visit on the booking tracker, on the day completed, one each: a client with three such visits counts 3. Walk-ins count too. The badge compares with the previous period; the line shows the count within each day, week or month.",
  },
} as const satisfies Record<string, StatInfo>;
