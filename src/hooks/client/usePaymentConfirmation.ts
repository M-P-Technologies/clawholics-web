import { useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { instagramUrl } from "@/lib/socialLinkData";
import { useNavigate, useSearchParams } from "@/lib/router";
import { API_BASE_URL } from "@/apiConfig";
import { usePolling } from "@/hooks/usePolling";
import { longDateLabel, timeRangeLabel } from "@/lib/timeFormat";
import { peso } from "@/lib/dashboardFormat";
import { type Appointment, type PaymentDetails } from "@/utils/paymentConfirmation";

export function usePaymentConfirmation() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [params] = useSearchParams();

  const appointment_id = params.get("appointment_id");

  const [data, setData] = useState<Appointment | null>(null);
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const [paymentStatus, setPaymentStatus] = useState<string>("PENDING");
  // True when we stopped checking after two minutes without a final answer
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Use a ref to track if we've already sent the confirmation email
  const emailSentRef = useRef(false);

  // Statuses after which the payment is settled, so there is no reason to keep asking
  const FINAL_STATUSES = ["CONFIRMED", "CANCELLED", "REJECTED", "REFUNDED"];

  const poll = async (): Promise<boolean> => {
    try {
      const token = await getToken();
      const authHeaders = {
        "x-clawholics-origin": "frontend",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(`${API_BASE_URL}/booking/appointments/${appointment_id}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to fetch appointment");

      const json = await res.json();
      setData(json);

      // Still waiting for the payment: that one request per tick is all we need
      if (!FINAL_STATUSES.includes(String(json.status).toUpperCase())) return false;

      // Settled either way: read the payment once, for the receipt and the email
      const paymentRes = await fetch(`${API_BASE_URL}/payment/details/${appointment_id}`, {
        headers: authHeaders,
      });

      if (paymentRes.ok) {
        const paymentJson = await paymentRes.json();

        setPayment(paymentJson);
        setPaymentStatus(paymentJson.status);

        // Only send the email once if PAID or SETTLED
        if (
          (paymentJson.status === "PAID" || paymentJson.status === "SETTLED" || json.status === "CONFIRMED") &&
          !emailSentRef.current
        ) {
          emailSentRef.current = true;
          try {
            await fetch(`${API_BASE_URL}/emails`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-clawholics-origin": "frontend",
              },
              body: JSON.stringify(paymentJson),
            });
          } catch (emailErr) {
            console.error("Failed to send confirmation email:", emailErr);
          }
        }
      }

      return true;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Every 5 seconds while the tab is open, for at most 2 minutes
  usePolling(poll, {
    intervalMs: 5000,
    maxMs: 120000,
    enabled: !!appointment_id,
    restartKey: attempt,
    onTimeout: () => setTimedOut(true),
  });

  const checkAgain = () => {
    setTimedOut(false);
    setAttempt((n) => n + 1);
  };

  const isFailed = paymentStatus === "FAILED" || data?.status === "CANCELLED";
  /** The downpayment is in, so the booking is confirmed */
  const isConfirmed = data?.status === "CONFIRMED";

  const dateLabel = longDateLabel(data?.appointment_date);
  const timeLabel = timeRangeLabel(data?.appointment_time);

  // Where the client sends the screenshot of their payment (the saved link, or the salon's own)
  const instagram = instagramUrl(useQuery(publicQueries.home()).data);

  /** What was actually paid ("₱500"), or null when the payment details didn't say */
  const paid = payment?.payment_amount ? peso(payment.payment_amount) : null;
  return { isFailed, isConfirmed, navigate, appointment_id, data, dateLabel, timeLabel, paid, payment, loading, paymentStatus, timedOut, checkAgain, instagram };
}
