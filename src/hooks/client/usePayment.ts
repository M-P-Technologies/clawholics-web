import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "@/lib/router";
import { useAuth } from "@clerk/nextjs";
import { createPayment, fetchPaymentSettings } from "@/services/paymentService";
import { OFFERED_PAYMENT_METHODS, PAYMENT_METHOD_HINTS, PAYMENT_METHOD_LABELS } from "@/data/payment";
import { fetchAppointmentById } from "@/services/appointmentService";
import { type AppointmentState, explainPaymentFailure, explainStatusChange } from "@/utils/payment";
import { CLIENT_PATHS } from "@/lib/client/clientNav";

export function usePayment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();

  // With a single way to pay, it is already chosen
  const [method, setMethod] = useState(OFFERED_PAYMENT_METHODS[0] ?? "");
  const [enabledMethods, setEnabledMethods] = useState<string[]>(OFFERED_PAYMENT_METHODS); // until the settings load; the server still checks the method
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!appointment?.appointment_id) {
      setLoading(false);
      return;
    }

    const verifyAppointment = async () => {
      try {
        const token = await getToken();
        const latestAppt = await fetchAppointmentById(appointment.appointment_id, token);
        
        const status = String(latestAppt.status || "").toUpperCase();
        
        if (status !== "PENDING") {
          setIsInvalid(true);
          setLoading(false); // We stop loading but isInvalid=true will keep the LoadingBar visible
          showModal(
            "This appointment can't be paid",
            explainStatusChange(status),
            () => navigate(CLIENT_PATHS.appointments),
            "View my schedule",
            false // Not dismissible
          );
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to verify appointment:", err);
        setIsInvalid(true);
        setLoading(false);
        showModal(
          "We couldn't check your reservation",
          "We couldn't confirm that your slot is still held, so we've paused the payment to keep you from paying for the wrong thing. You haven't been charged. Please go back to booking and try again.",
          () => navigate(CLIENT_PATHS.explore),
          "Back to booking",
          false,
        );
      }
    };

    verifyAppointment();
  }, [appointment, getToken, navigate]);

  // The Xendit channels the salon has enabled. MANUAL (payment proof) isn't paid from this screen.
  useEffect(() => {
    fetchPaymentSettings()
      .then((settings) => {
        const online = settings.payment_methods.filter((m) => OFFERED_PAYMENT_METHODS.includes(m) && Object.hasOwn(PAYMENT_METHOD_LABELS, m));
        if (online.length === 0) return;
        setEnabledMethods(online);
        setMethod((current) => (online.includes(current) ? current : online.length === 1 ? online[0] : ""));
      })
      .catch((err) => console.error("Failed to load payment methods:", err));
  }, []);

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
        setLoading(false);

        showModal(
          "Reservation expired",
          "The hold on your time slot has ended and the slot was released. You have not been charged. Please book again to pick a new time.",
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
        "The hold on your time slot has ended and the slot was released. You have not been charged. Please book again to pick a new time.",
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

      const failure = explainPaymentFailure(err);

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

  const sectionLabel = "label-caps";

  // Closing the dialog also runs its follow-up action, so it cannot be dismissed without it.
  const handleModalClose = () => {
    setModalOpen(false);
    if (modalAction) modalAction();
  };

  const toggleAgree = () => setAgree(!agree);

  const methods = enabledMethods.map((code) => ({ code, label: PAYMENT_METHOD_LABELS[code], hint: PAYMENT_METHOD_HINTS[code] }));

  return { methods, toggleAgree, navigate, method, setMethod, agree, setAgree, loading, isInvalid, timeLeft, modalOpen, setModalOpen, modalTitle, modalMessage, modalAction, modalButtonText, modalDismissible, appointment, handlePay, sectionLabel, handleModalClose };
}
