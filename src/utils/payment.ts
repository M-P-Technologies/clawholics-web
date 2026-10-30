import { CLIENT_PATHS } from "../lib/client/clientNav";



export interface AppointmentState {
  appointment_id: number;
  service_name: string;
  nailist_name: string;
  nailist_category_id: number;
  nailist_is_master?: number | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
  expires_at: string;
  service_price: number;
  customer_name: string;
}

interface PaymentFailure {
  title: string;
  message: string;
  /** Where the button of the modal goes. Without it the modal just closes. */
  next?: { label: string; path: string; state?: unknown };
}

const SCHEDULE = { label: "View my schedule", path: CLIENT_PATHS.appointments };

// Turns what the server (or the network) said into something a client can act on.
// Every message says what happened, whether they were charged, and what to do next.
export function explainPaymentFailure(error: unknown, label = "This appointment"): PaymentFailure {
  // "This appointment" / "Your Gel Manicure appointment with Miss Emily", and the same inside a sentence
  const lower = label.charAt(0).toLowerCase() + label.slice(1);
  // fetch only throws a TypeError when the request never reached the server
  if (error instanceof TypeError) {
    return {
      title: "No connection",
      message:
        "We couldn't reach our payment service because the connection was lost. You haven't been charged, and your slot stays held until the timer runs out. Please check your connection and press Pay again.",
    };
  }

  const raw = error instanceof Error ? error.message : "";
  const text = raw.toLowerCase();

  if (text.includes("unauthenticated") || text.includes("log in")) {
    return {
      title: "Please sign in again",
      message:
        "Your session has ended, so we couldn't start the payment. You haven't been charged. Sign in again, then pay from My Schedule. Your slot stays held until the timer runs out.",
      next: { label: "Log in", path: "/login" },
    };
  }
  if (text.includes("already been paid")) {
    return {
      title: "Already paid",
      message: `${label} has already been paid, so there is nothing more to pay. You can see it in My Schedule.`,
      next: SCHEDULE,
    };
  }
  if (text.includes("cancelled")) {
    return {
      title: "Appointment cancelled",
      message: `${label} was cancelled, so it can't be paid. Nothing was charged. You can book a new time whenever you're ready.`,
      next: { label: "Book again", path: CLIENT_PATHS.explore },
    };
  }
  if (text.includes("expired") || text.includes("expiration")) {
    return {
      title: "Reservation expired",
      message: `The hold on the time slot for ${lower} has ended and the slot was released. You haven't been charged. Please book again to pick a new time.`,
      next: { label: "Back to booking", path: CLIENT_PATHS.explore },
    };
  }
  if (text.includes("still generating")) {
    return {
      title: "Almost ready",
      message: "Your payment page is still being prepared. You haven't been charged. Wait a few seconds, then press Pay again.",
    };
  }
  if (text.includes("active payment session") || text.includes("pending appointment") || text.includes("existing appointment")) {
    return {
      title: "Payment already started",
      message: `You already have a payment open for ${lower}. Finish it from My Schedule, or let it expire before starting another. You haven't been charged twice.`,
      next: SCHEDULE,
    };
  }
  if (text.includes("being confirmed")) {
    return {
      title: "Payment already received",
      message: "We've received your earlier payment and are confirming your appointment, so there's nothing more to pay. Check My Schedule in a moment.",
      next: SCHEDULE,
    };
  }
  if (text.includes("payment method is not available")) {
    return {
      title: "Payment method unavailable",
      message: "This payment method can't be used right now. You haven't been charged, and your slot stays held until the timer runs out. Please choose another method and press Pay again.",
    };
  }
  if (text.includes("forbidden") || text.includes("unauthorized access")) {
    return {
      title: "This isn't your appointment",
      message: "You're signed in with a different account than the one that made this booking, so we can't take payment for it. Sign in with the right account, or check My Schedule.",
      next: SCHEDULE,
    };
  }
  if (text.includes("not found")) {
    return {
      title: "Appointment not found",
      message: `We couldn't find ${lower}, so no payment was started and you haven't been charged. Please check My Schedule.`,
      next: SCHEDULE,
    };
  }

  return {
    title: "We couldn't start your payment",
    message:
      "Something went wrong on our side while opening the payment page. You haven't been charged, and your slot stays held until the timer runs out. Please try again in a moment.",
  };
}

// What to tell someone who opens the payment page for an appointment that can no longer be paid
export function explainStatusChange(status: string, label = "This appointment"): string {
  switch (status.toLowerCase()) {
    case "confirmed":
      return `${label} is already confirmed, so there is nothing left to pay. You can see it in My Schedule.`;
    case "cancelled":
      return `${label} was cancelled, so it can't be paid. You can book a new time whenever you're ready.`;
    case "completed":
      return `${label} has already taken place, so there is nothing to pay. You can see it in My Schedule.`;
    default:
      return `${label} is now ${status.toLowerCase().replace(/_/g, " ")}, so it can't be paid from here. You can check it in My Schedule.`;
  }
}
