// The ⓘ notes on the report pages' stat cards (Dashboard, Sales, Performance): what each number
// is, and how it's counted, in the words an admin would use. Keep them in step with
// server/dashboard.ts when a number's rule changes.
export interface StatInfo {
  /** What the number is, in a sentence */
  about: string;
  /** How it's counted */
  how: string;
}

export const STAT_INFO = {
  // Performance: the visits done
  collected: {
    about: "The downpayments of the visits done in this period.",
    how: "Counts only visits finished with Complete visit, on the day they were completed.",
  },
  sales: {
    about: "What the visits done in this period sold for.",
    how: "Each visit finished with Complete visit counts its downpayment plus the balance paid at the salon, on the day it was completed.",
  },
  bookings: {
    about: "How many visits were done in this period.",
    how: "Counts the visits finished with Complete visit, on the day they were completed.",
  },
  returningClients: {
    about: "Clients who have come back: two or more visits done.",
    how: "A running count as of the end of the period. Only visits finished with Complete visit count; the walk-in guest doesn't.",
  },

  // Sales
  grossReceipts: {
    about: "All the money that came in during the period.",
    how: "Downpayments paid (on the day paid) + balances paid at the salon (on the day the visit was completed) − refunds (on the day refunded).",
  },
  unearned: {
    about: "Downpayment money held today for visits that haven't happened yet. It's the same for every period, since every period ends today.",
    how: "Every paid downpayment whose visit isn't completed, cancelled, refunded or a no-show yet. A payment that came after its booking was cancelled is held too, until refunded.",
  },
  otherIncome: {
    about: "Money kept as penalties. It's already part of Gross receipts, not extra.",
    how: "Downpayments kept when a client didn't show up or cancelled too late (on the day it happened) + late fees (on the day the visit was completed).",
  },
  refunds: {
    about: "Downpayments given back to clients.",
    how: "Counted on the day refunded, and taken off Gross receipts. A refund made outside the app isn't counted.",
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
  averageSale: {
    about: "What one visit sold for, on average.",
    how: "Sales ÷ the visits finished with Complete visit in the period.",
  },
  lifetimeValue: {
    about: "What a client has spent at the salon so far, on average.",
    how: "What every visit finished with Complete visit sold for (downpayment + the balance paid at the salon) ÷ the clients with one, over all time. The walk-in guest doesn't count.",
  },
  churn: {
    about: "How many clients seem to have stopped coming.",
    how: "Clients whose last visit finished with Complete visit was completed more than 60 days ago ÷ all clients with one. The walk-in guest doesn't count.",
  },
  loyalty: {
    about: "The loyalty cards' activity in the period.",
    how: "Stamps given with the Admin Scanner / rewards redeemed, on the day scanned.",
  },
  // Dashboard: the salon at a glance
  totalClients: {
    about: "How many clients have come to the salon, as of today.",
    how: "Client accounts with at least one visit an admin confirmed and then finished with Complete visit on the booking tracker (not the walk-in guest). The line shows the count on each day of this month, from the day each client's first visit was completed. The badge compares today's count with the count at the end of last month.",
  },
  services: {
    about: "How many services the salon offers today.",
    how: "The services shown on the Services page: active, in an active category. The line shows how many different services were booked on each day of this month, and the badge compares how many were booked this month with last month.",
  },
  artists: {
    about: "How many nail artists the salon has today.",
    how: "The artists shown on the Artists page. The line shows how many artists had bookings on each day of this month, and the badge compares how many had bookings this month with last month.",
  },
  appointments: {
    about: "How many appointments the salon has done, as of today.",
    how: "Every visit an admin confirmed and then finished with Complete visit on the booking tracker, one each: a client with three such visits counts 3. Walk-ins count too. The line shows the count on each day of this month, and the badge compares today's count with the count at the end of last month.",
  },
} as const satisfies Record<string, StatInfo>;
