import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@/lib/router";
import { useUser, useAuth } from "@clerk/nextjs";
import { fetchBookedSlotsDetailed } from "../services/bookingService";
import { fetchNailistDayOffs, fetchNailistTimeSlots } from "../services/nailistService";
import { rescheduleAppointment } from "../services/bookingService";
import { isOverlapping, toLocalDate, toLocalDateString } from "../utils/reschedule";
import { CLIENT_PATHS } from "../lib/client/clientNav";

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
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [dayOffs, setDayOffs] = useState<number[]>([]);
  const [customOffs, setCustomOffs] = useState<string[]>([]);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);

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
          "Your reservation time has expired and this appointment was cancelled.",
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

  useEffect(() => {
    if (!appointment) return;

    fetchNailistTimeSlots(appointment.nailist_id).then(setTimeSlots);

    fetchNailistDayOffs(appointment.nailist_id).then((data) => {
      setDayOffs(data.regularDays || []);
      setCustomOffs(data.customDates || []);
    });
  }, [appointment]);

  useEffect(() => {
    if (!appointment || timeSlots.length === 0) return;

    const loadMonthAvailability = async () => {
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 1);

      const promises = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const formatted = toLocalDateString(d);
        promises.push(
          fetchBookedSlotsDetailed(appointment.nailist_id, formatted).then(
            (slots) => ({
              date: formatted,
              times: slots.map((s: any) => s.appointment_time),
            }),
          ),
        );
      }

      const results = await Promise.all(promises);
      const dates = results
        .filter((r) =>
          timeSlots.every((slot) =>
            r.times.some((b: string) => isOverlapping(b, slot)),
          ),
        )
        .map((r) => r.date);

      setFullyBookedDates(dates);
    };

    loadMonthAvailability();
  }, [appointment, timeSlots]);

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

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

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
      showModal("Almost there", "Please choose both a new date and a new time. Your current appointment stays as it is until you confirm.");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication failed. Please log in again.");
      }

      const latest = await fetchBookedSlotsDetailed(
        appointment.nailist_id,
        selectedDate,
      );

      const conflict = latest.some((s: any) =>
        isOverlapping(selectedTime, s.appointment_time),
      );

      if (conflict) {
        showModal(
          "Slot Unavailable",
          "Someone else just reserved that time. Your appointment has not changed yet, so please pick a different time.",
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

      showModal(
        "Appointment rescheduled",
        "Your appointment is now on the new date and time. You can see the updated details in My Schedule.",
        () => navigate(CLIENT_PATHS.appointments, { replace: true }),
      );
    } catch (err: any) {
      showModal(
        "We couldn't reschedule",
        err.message || "Something went wrong, so your appointment was not changed and is still on its original date and time. Please try again in a moment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date || !appointment) return;

    const formatted = toLocalDateString(date);

    const slots = await fetchBookedSlotsDetailed(appointment.nailist_id, formatted);
    const times = slots.map((s: any) => s.appointment_time);

    if (timeSlots.length === 0) return;
    const fullyBooked = timeSlots.every((slot) => times.some((b: string) => isOverlapping(b, slot)));

    if (fullyBooked) {
      showModal("Fully booked", "There are no times left on this day. Please choose another date.");
      return;
    }

    setSelectedDate(formatted);
    setBookedSlots(times);
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

  return { isLoaded, appointment, isSubmitting, month, setMonth, selectedDate, setSelectedDate, selectedTime, setSelectedTime, timeSlots, setBookedSlots, fullyBookedDates, modalOpen, setModalOpen, modalTitle, modalMessage, modalAction, isDisabledDate, formatDisplayDate, isTimeBlocked, isPastTimeToday, showModal, handleConfirmReschedule, handleDateSelect, selectedDay, isDateFullyBooked, isSlotBlocked, uniqueTimeSlots, handleModalClose };
}
