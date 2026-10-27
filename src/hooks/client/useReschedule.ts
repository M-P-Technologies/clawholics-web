import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@/lib/router";
import { useUser, useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { rescheduleAppointment } from "@/services/bookingService";
import { ACCOUNT } from "@/lib/accountQueries";
import { formatSlot, isOverlapping, toLocalDate, toLocalDateString } from "@/utils/reschedule";
import { CLIENT_PATHS } from "@/lib/client/clientNav";
import { rescheduleLabels } from "@/lib/client/reschedule";
import { useArtistAvailability } from "../useArtistAvailability";
import { longDateLabel, timeRangeLabel } from "@/lib/timeFormat";
import { itemName } from "@/lib/itemName";

export function useReschedule() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();

  const appointment = location.state?.appointment;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [month, setMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const queryClient = useQueryClient();
  // The artist's hours, days off, the next month's fully booked days (one request) and the chosen
  // day's taken times, shared with booking (lib/bookingQueries)
  const { timeSlots, dayOffs, customOffs, fullyBookedDates, bookedSlots, isDayFullyBooked, fetchTakenTimes } =
    useArtistAvailability(appointment?.nailist_id, selectedDate);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalAction, setModalAction] = useState<(() => void) | undefined>();

  useEffect(() => {
    if (
      !appointment ||
      appointment.status.toLowerCase() !== "pending" ||
      !appointment.expires_at
    ) {
      return;
    }

    const updateTimer = () => {
      const expiry = new Date(appointment.expires_at!).getTime();
      const now = Date.now();
      const diff = expiry - now;

      if (diff <= 0) {
        showModal(
          "Reservation expired",
          `Your reservation for ${itemName(appointment.service_name, "this appointment")}${appointment.nailist_name ? ` with ${appointment.nailist_name}` : ""} has expired and the appointment was cancelled.`,
          () => navigate(CLIENT_PATHS.appointments, { replace: true }),
        );
        return false;
      }
      return true;
    };

    const isAlive = updateTimer();

    if (isAlive) {
      const interval = setInterval(() => {
        const stillAlive = updateTimer();
        if (!stillAlive) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [appointment, navigate]);

  useEffect(() => {
    if (isLoaded && (!isSignedIn || !appointment)) {
      navigate(CLIENT_PATHS.appointments, { replace: true });
      return;
    }

    if (isLoaded && appointment && appointment.status.toLowerCase() === "pending") {
      navigate(CLIENT_PATHS.appointments, { replace: true });
    }
  }, [isLoaded, isSignedIn, appointment, navigate]);

  const isDisabledDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    const max = new Date();
    max.setMonth(max.getMonth() + 1);
    if (date > max) return true;

    if (dayOffs.includes(date.getDay())) return true;
    const formatted = toLocalDateString(date);
    if (customOffs.includes(formatted)) return true;
    if (fullyBookedDates.includes(formatted)) return true;

    return false;
  };

  const formatDisplayDate = longDateLabel;

  const isTimeBlocked = (slot: string) =>
    bookedSlots.some((b) => isOverlapping(b, slot));

  const isPastTimeToday = (slot: string) => {
    if (!selectedDate) return false;
    const today = new Date();
    const selected = toLocalDate(selectedDate);
    if (selected.toDateString() !== today.toDateString()) return false;

    const now = today.getHours() * 60 + today.getMinutes();
    const [start] = slot.split("-");
    const [h, m] = start.split(":").map(Number);
    return h * 60 + m <= now;
  };

  const showModal = (title: string, message: string, action?: () => void) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalAction(() => action);
    setModalOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!appointment || !selectedDate || !selectedTime) {
      showModal("Almost there", `Please choose both a new date and a new time. Your ${itemName(appointment.service_name, "current")} appointment stays as it is until you confirm.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication failed. Please log in again.");
      }

      const latest = await fetchTakenTimes(selectedDate);

      const conflict = latest.some((taken) => isOverlapping(selectedTime, taken));

      if (conflict) {
        showModal(
          "Slot Unavailable",
          `Someone else just reserved ${itemName(appointment.nailist_name, "that artist")} at ${timeRangeLabel(selectedTime)}. Your ${itemName(appointment.service_name, "current")} appointment has not changed yet, so please pick a different time.`,
        );
        setSelectedTime("");
        return;
      }

      await rescheduleAppointment(
        appointment.id,
        selectedDate,
        selectedTime,
        token,
      );
      // The client's appointments (and every cached booking view of them) show the new time
      void queryClient.invalidateQueries({ queryKey: [ACCOUNT] });

      showModal(
        "Appointment rescheduled",
        `Your ${itemName(appointment.service_name, "booked")} appointment with ${itemName(appointment.nailist_name, "your artist")} is now on ${longDateLabel(selectedDate)} at ${timeRangeLabel(selectedTime)}. You can see the updated details in My Schedule.`,
        () => navigate(CLIENT_PATHS.appointments, { replace: true }),
      );
    } catch (err) {
      showModal(
        "We couldn't reschedule",
        (err as { message?: string } | null)?.message || `Something went wrong, so your ${itemName(appointment.service_name, "booked")} appointment was not changed and is still on its original date and time. Please try again in a moment.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date || !appointment) return;

    const formatted = toLocalDateString(date);

    const times = await fetchTakenTimes(formatted);

    if (timeSlots.length === 0) return;
    const fullyBooked = isDayFullyBooked(times);

    if (fullyBooked) {
      showModal("Fully booked", `${itemName(appointment.nailist_name, "This artist")} has no times left on ${longDateLabel(formatted)}. Please choose another date.`);
      return;
    }

    // The day's taken times are now cached for its time list
    setSelectedDate(formatted);
    setSelectedTime("");
  };

  const selectedDay = selectedDate ? toLocalDate(selectedDate) : undefined;
  const isDateFullyBooked = (date: Date) => fullyBookedDates.includes(toLocalDateString(date));
  const isSlotBlocked = (slot: string) => isTimeBlocked(slot) || isPastTimeToday(slot);
  const uniqueTimeSlots = Array.from(new Set(timeSlots));

  const handleModalClose = () => {
    setModalOpen(false);
    if (modalAction) modalAction();
  };

  // The summary's old and new date and time
  const labels = rescheduleLabels(appointment, selectedDate, selectedTime, formatDisplayDate);

  return { formatSlot, ...labels, isLoaded, appointment, isSubmitting, month, setMonth, selectedDate, setSelectedDate, selectedTime, setSelectedTime, timeSlots, fullyBookedDates, modalOpen, setModalOpen, modalTitle, modalMessage, modalAction, isDisabledDate, formatDisplayDate, isTimeBlocked, isPastTimeToday, showModal, handleConfirmReschedule, handleDateSelect, selectedDay, isDateFullyBooked, isSlotBlocked, uniqueTimeSlots, handleModalClose };
}
