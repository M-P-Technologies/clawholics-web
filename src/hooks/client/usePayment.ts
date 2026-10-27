import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { ACCOUNT } from "@/lib/accountQueries";
import { useNavigate, useLocation } from "@/lib/router";
import { useAuth } from "@clerk/nextjs";
import { createPayment } from "@/services/paymentService";
import { OFFERED_PAYMENT_METHODS, PAYMENT_METHOD_HINTS, PAYMENT_METHOD_LABELS } from "@/data/payment";
import { fetchAppointmentById } from "@/services/appointmentService";
import { type AppointmentState, explainPaymentFailure, explainStatusChange } from "@/utils/payment";
import { CLIENT_PATHS } from "@/lib/client/clientNav";
import { paymentArtistLabel, paymentPriceLabel } from "@/lib/client/payment";
import { longDateLabel, timeRangeLabel } from "@/lib/timeFormat";
import { itemName } from "@/lib/itemName";

export function usePayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();

  // With a single way to pay, it is already chosen
  const [method, setMethod] = useState(OFFERED_PAYMENT_METHODS[0] ?? "");
  const [agree, setAgree] = useState(false);
  // Set once the hold runs out, which ends the wait for the check
  const [expired, setExpired] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const isProcessing = useRef(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalAction, setModalAction] = useState<(() => void) | undefined>();
  const [modalButtonText, setModalButtonText] = useState("OK");
  const [modalDismissible, setModalDismissible] = useState(true);

  const appointment = location.state as AppointmentState | null;
  // What the payment dialogs call this booking: "Your Gel Manicure appointment with Miss Emily"
  const label = appointment ? `Your ${itemName(appointment.service_name, "booked")} appointment with ${itemName(appointment.nailist_name, "your artist")}` : undefined;

  // The appointment as the server has it now: never answered from the cache, since paying for a
  // slot that's no longer held must not happen
  const appointmentId = appointment?.appointment_id;
  const latest = useQuery({
    queryKey: [ACCOUNT, "payment", appointmentId],
    queryFn: async () => fetchAppointmentById(appointmentId!, await getToken()),
    enabled: !!appointmentId,
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const verifying = !!appointmentId && latest.isPending;
  const loading = verifying && !expired;

  useEffect(() => {
    if (latest.data) {
      const status = String(latest.data.status || "").toUpperCase();
      if (status !== "PENDING") {
        setIsInvalid(true); // keeps the LoadingBar visible
        showModal(
          `Your ${itemName(appointment?.service_name, "booked")} appointment can't be paid`,
          explainStatusChange(status, label),
          () => navigate(CLIENT_PATHS.appointments),
          "View my schedule",
          false // Not dismissible
        );
      }
    } else if (latest.isError) {
      console.error("Failed to verify appointment:", latest.error);
      setIsInvalid(true);
      showModal(
        "We couldn't check your reservation",
        `We couldn't confirm that your ${itemName(appointment?.service_name, "booked")} slot is still held, so we've paused the payment to keep you from paying for the wrong thing. You haven't been charged. Please go back to booking and try again.`,
        () => navigate(CLIENT_PATHS.explore),
        "Back to booking",
        false,
      );
    }
  }, [latest.data, latest.isError, latest.error, navigate]);

  // The Xendit channels the salon has enabled (shared with the other public content). MANUAL
  // (payment proof) isn't paid from this screen. Until they load, every offered method shows;
  // the server still checks the method.
  const settings = useQuery(publicQueries.paymentSettings());
  useEffect(() => {
    if (settings.isError) console.error("Failed to load payment methods:", settings.error);
  }, [settings.isError, settings.error]);
  const online = (settings.data?.payment_methods ?? []).filter((m) => OFFERED_PAYMENT_METHODS.includes(m) && Object.hasOwn(PAYMENT_METHOD_LABELS, m));
  const enabledMethods = online.length > 0 ? online : OFFERED_PAYMENT_METHODS;
  const enabledKey = enabledMethods.join(",");

  useEffect(() => {
    const enabled = enabledKey.split(",");
    setMethod((current) => (enabled.includes(current) ? current : enabled.length === 1 ? enabled[0] : ""));
  }, [enabledKey]);

  useEffect(() => {
    if (!appointment?.expires_at) {
      return;
    }

    const updateTimer = () => {
      const expiry = new Date(appointment.expires_at).getTime();
      const now = Date.now();

      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        setIsInvalid(true);
        setExpired(true);

        showModal(
          "Reservation expired",
          `The hold on your ${itemName(appointment?.service_name, "booking")} slot${appointment?.nailist_name ? ` with ${appointment.nailist_name}` : ""} has ended and the slot was released. You have not been charged. Please book again to pick a new time.`,
          () => navigate(CLIENT_PATHS.explore),
          "Back to Booking",
          false // Not dismissible
        );

        return false;
      }

      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft(
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      );

      return true;
    };

    updateTimer();

    const interval = setInterval(() => {
      const shouldContinue = updateTimer();

      if (!shouldContinue) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [appointment, navigate]);

  const showModal = (
    title: string,
    message: string,
    action?: () => void,
    buttonText = "OK",
    dismissible = true,
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalAction(() => action);
    setModalButtonText(buttonText);
    setModalDismissible(dismissible);
    setModalOpen(true);
  };

  const handlePay = async () => {
    if (isProcessing.current || !appointment) return;

    if (timeLeft === "00:00") {
      showModal(
        "Reservation expired",
        `The hold on your ${itemName(appointment?.service_name, "booking")} slot${appointment?.nailist_name ? ` with ${appointment.nailist_name}` : ""} has ended and the slot was released. You have not been charged. Please book again to pick a new time.`,
        () => navigate(CLIENT_PATHS.explore),
        "Back to booking",
      );
      return;
    }

    if (!method) {
      showModal(
        "No Payment Method Selected",
        "Please choose how you would like to pay your downpayment, then press Pay again.",
      );
      return;
    }

    if (!agree) {
      showModal(
        "Agree to Terms & Conditions",
        "Please tick the box to confirm you have read our Terms & Conditions. You can open them from the link beside the box before you agree.",
      );
      return;
    }

    isProcessing.current = true;
    const payBtn = document.getElementById("pay-button");
    if (payBtn) payBtn.innerText = "Processing...";

    try {
      const payload = {
        appointment_id: appointment.appointment_id,
        payment_method: method,
      };

      const token = await getToken();
      const res = await createPayment(payload, token);

      if (!res || !res.invoice_url) {
        throw new Error("Invalid payment response");
      }

      window.location.href = res.invoice_url;
    } catch (err) {
      console.error("Payment failed:", err);

      const failure = explainPaymentFailure(err, label);

      showModal(
        failure.title,
        failure.message,
        failure.next ? () => navigate(failure.next!.path, { state: failure.next!.state }) : undefined,
        failure.next?.label,
      );
      if (payBtn) payBtn.innerText = "Pay downpayment";
    } finally {
      isProcessing.current = false;
    }
  };


  // Closing the dialog also runs its follow-up action, so it cannot be dismissed without it.
  const handleModalClose = () => {
    setModalOpen(false);
    if (modalAction) modalAction();
  };

  const toggleAgree = () => setAgree(!agree);

  const methods = enabledMethods.map((code) => ({ code, label: PAYMENT_METHOD_LABELS[code], hint: PAYMENT_METHOD_HINTS[code] }));

  // The summary's artist (a star for a master) and price
  const artistLabel = appointment ? paymentArtistLabel(appointment) : "";
  const priceLabel = appointment ? paymentPriceLabel(appointment) : "";

  const dateLabel = longDateLabel(appointment?.appointment_date);
  const timeLabel = timeRangeLabel(appointment?.appointment_time);

  return { artistLabel, priceLabel, dateLabel, timeLabel, methods, toggleAgree, navigate, method, setMethod, agree, setAgree, loading, isInvalid, timeLeft, modalOpen, setModalOpen, modalTitle, modalMessage, modalAction, modalButtonText, modalDismissible, appointment, handlePay, handleModalClose };
}
