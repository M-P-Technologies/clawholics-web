import { useEffect } from "react";
import { useNavigate, useLocation } from "@/lib/router";
import { useClientWideLayout } from "@/hooks/useMinWidth";
import { CLIENT_PATHS } from "@/lib/client/clientNav";
import { paymentArtistLabel } from "@/lib/client/payment";
import { longDateLabel, timeRangeLabel } from "@/lib/timeFormat";
import type { AppointmentState } from "@/utils/payment";

// The phone's booking summary step, between choosing a time and paying. The booking was already made
// (its slot is held) by the Book step, which passes it on in the router state; Continue hands the same
// state to the payment. From `lg` the summary sits beside the payment, so this page isn't used.
export function useBookingSummary() {
  const navigate = useNavigate();
  const location = useLocation();
  const appointment = location.state as AppointmentState | null;
  const wide = useClientWideLayout();

  // A wide screen has no summary page (a phone turned, or a window widened): on to the payment
  useEffect(() => {
    if (wide && appointment) navigate(CLIENT_PATHS.payment, { state: appointment, replace: true });
  }, [wide, appointment, navigate]);

  const goToPayment = () => navigate(CLIENT_PATHS.payment, { state: appointment });

  return {
    appointment,
    wide,
    artistLabel: appointment ? paymentArtistLabel(appointment) : "",
    dateLabel: longDateLabel(appointment?.appointment_date),
    timeLabel: timeRangeLabel(appointment?.appointment_time),
    goToPayment,
  };
}
