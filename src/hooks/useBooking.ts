/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@/lib/router";
import { useUser, useAuth } from "@clerk/nextjs";
import { fetchNailists, fetchBookedSlotsDetailed, createBooking } from "../services/bookingService";
import { fetchNailistDayOffs, fetchNailistTimeSlots } from "../services/nailistService";
import { fetchHomeContent } from "../services/contentService";
import { fetchProfileIfExists } from "../services/userService";
import { fetchCategories, type ServiceCategory } from "../services/catalogService";
import { estimateTotal } from "../services/pricing";
import { type Nailist, type BookingState, parseTimeRange } from "../utils/booking";

export function useBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const state = location.state as BookingState | null;

  const [pageData, setPageData] = useState<Record<string, string> | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");

  const [nailists, setNailists] = useState<Nailist[]>([]);
  const [selectedNailist, setSelectedNailist] = useState<Nailist | null>(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [dayOffs, setDayOffs] = useState<number[]>([]);
  const [customOffs, setCustomOffs] = useState<string[]>([]);
  const [fullyBookedDates, setFullyBookedDates] = useState<string[]>([]);

  const [month, setMonth] = useState(new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalAction, setModalAction] = useState<(() => void) | undefined>();
  const [modalButtonText, setModalButtonText] = useState("OK");

  const service_category = state?.service_category ?? "";
  const service_id = state?.service_id ?? 0;
  const service_description = state?.service_description ?? "";
  const service_name = state?.service_name ?? "";
  const service_image = state?.service_image ?? "";
  const junior_price = state?.junior_price ?? 0;
  const master_price = state?.master_price ?? 0;
  const pricing_type: "tiered" | "flat" = state?.pricing_type ?? "tiered";
  const flat_price = state?.price ?? 0;
  const variants: { id: number; name: string; price: number }[] = state?.variants ?? [];
  const service_category_id: number | null = state?.service_category_id ?? null;

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const addons = categories.find((c) => c.id === service_category_id)?.addons ?? [];

  const selectedPrice = estimateTotal({
    service: { pricing_type, master_price, junior_price, price: flat_price, variants },
    isMaster: selectedNailist?.category_id === 1,
    variantId: selectedVariantId,
    addons,
    addonIds: selectedAddonIds,
  });

  // The price line of the summary, with the artist's rate when the price depends on the tier
  const priceLabel =
    selectedPrice === null
      ? "Choose an option to see the price"
      : `Starts at ₱${selectedPrice}${
          variants.length === 0 && pricing_type === "tiered"
            ? selectedNailist?.category_id === 1
              ? " (Master Rate) ★"
              : " (Junior Rate)"
            : ""
        }`;

  const locationUrl = pageData?.contact_location_url || "";
  const locationText = pageData?.contact_location || "";

  useEffect(() => {
    const loadPageContent = async () => {
      try {
        setIsPageLoading(true);
        setPageError("");

        const data = await fetchHomeContent();
        setPageData(data);
      } catch (err) {
        console.error("Failed to load booking page content", err);
        setPageError("Failed to load location.");
      } finally {
        setIsPageLoading(false);
      }
    };

    loadPageContent();
  }, []);

  useEffect(() => {
    if (!selectedNailist) return;

    fetchNailistTimeSlots(selectedNailist.id).then((slots) => {
      setTimeSlots(slots);
    });
  }, [selectedNailist]);

  useEffect(() => {
    if (!selectedNailist || timeSlots.length === 0) return;

    const loadMonthAvailability = async () => {
      const start = new Date();
      const end = new Date();
      end.setMonth(end.getMonth() + 1);

      const promises = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const formatted = `${y}-${m}-${day}`;

        promises.push(
          fetchBookedSlotsDetailed(selectedNailist.id, formatted).then(
            (slots) => ({
              date: formatted,
              times: slots.map((s: any) => s.appointment_time),
            }),
          ),
        );
      }

      const results = await Promise.all(promises);

      const dates = results
        .filter((r) => isDayFullyBooked(r.times))
        .map((r) => r.date);

      setFullyBookedDates(dates);
    };

    loadMonthAvailability();
  }, [selectedNailist, timeSlots]);

  useEffect(() => {
    if (!state) navigate("/");
  }, [state, navigate]);

  useEffect(() => {
    if (!service_id) return;

    fetchNailists(service_id).then((data) => {
      setNailists(data);
      // Coming from an artist's page: that artist is already chosen, if they offer this service
      setSelectedNailist(data.find((n: Nailist) => n.id === state?.nailist_id) ?? null);
      setSelectedDate("");
      setSelectedTime("");
      setBookedSlots([]);
      setTimeSlots([]);
      setFullyBookedDates([]);
    });
  }, [service_id]);

  useEffect(() => {
    if (!selectedNailist) return;

    fetchNailistDayOffs(selectedNailist.id).then((data) => {
      setDayOffs(data.regularDays || []);
      setCustomOffs(data.customDates || []);
    });
  }, [selectedNailist]);

  useEffect(() => {
    if (!selectedNailist || !selectedDate) return;

    fetchBookedSlotsDetailed(selectedNailist.id, selectedDate).then((slots) => {
      setBookedSlots(slots.map((s: any) => s.appointment_time));
    });
  }, [selectedNailist, selectedDate]);

  const isOverlapping = (a: string, b: string) => {
    const r1 = parseTimeRange(a);
    const r2 = parseTimeRange(b);
    return r1.start < r2.end && r2.start < r1.end;
  };

  const isDayFullyBooked = (bookedSlots: string[]) => {
    if (timeSlots.length === 0) return false;

    return timeSlots.every((slot) =>
      bookedSlots.some((b) => isOverlapping(b, slot)),
    );
  };

  const isDisabledDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return true;

    const max = new Date();
    max.setMonth(max.getMonth() + 1);
    if (date > max) return true;

    if (selectedNailist) {
      if (dayOffs.includes(date.getDay())) return true;

      const formatted = toLocalDateString(date);
      if (customOffs.includes(formatted)) return true;

      if (fullyBookedDates.includes(formatted)) return true;

      if (areAllSlotsPastForDate(date)) return true;
    }

    return false;
  };

  const toLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const toLocalDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const isTimeBlocked = (slot: string) => {
    return bookedSlots.some((b) => isOverlapping(b, slot));
  };

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

  const areAllSlotsPastForDate = (date: Date) => {
    const today = new Date();

    if (date.toDateString() !== today.toDateString()) {
      return false;
    }

    return timeSlots.every((slot) => {
      const [start] = slot.split("-");
      const [h, m] = start.split(":").map(Number);

      const slotMinutes = h * 60 + m;
      const nowMinutes = today.getHours() * 60 + today.getMinutes();

      return slotMinutes <= nowMinutes;
    });
  };

  const formatSlot = (slot: string) => {
    const [start, end] = slot.split("-");

    const format = (t: string) => {
      const [h24, m] = t.split(":").map(Number);
      const ampm = h24 >= 12 ? "PM" : "AM";
      const h = h24 % 12 || 12;
      return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
    };

    return `${format(start)} - ${format(end)}`;
  };

  const showModal = (
    title: string,
    message: string,
    action?: () => void,
    buttonText = "OK",
  ) => {
    setModalTitle(title);
    setModalMessage(message);
    setModalAction(() => action);
    setModalButtonText(buttonText);
    setModalOpen(true);
  };

  const submitBooking = async () => {
    if (!isSignedIn || !user) {
      showModal(
        "Login Required",
        "Please log in to reserve your slot. Once you are signed in, come back to this service and pick your artist and time again.",
        () => navigate("/login"),
        "Go to Login",
      );

      return;
    }

    if (!selectedNailist || !selectedDate || !selectedTime) {
      showModal(
        "Almost there",
        "Please choose an artist, a date and a time before continuing. Anything still showing a dash in your Booking summary is missing.",
      );
      return;
    }

    const latest = await fetchBookedSlotsDetailed(
      selectedNailist.id,
      selectedDate,
    );

    const conflict = latest.some((s: any) =>
      isOverlapping(selectedTime, s.appointment_time),
    );

    if (conflict) {
      showModal(
        "Slot Unavailable",
        "Someone else just reserved that time. Your other choices are kept, so please pick a different time to continue.",
      );
      setSelectedTime("");
      return;
    }

    const token = await getToken();
    const profile = await fetchProfileIfExists(user.id, token);

    // Safety check in case they bypassed the service page
    if (!profile || !profile.onboarded) {
      showModal(
        "Onboarding Required",
        "We need a few details, like your phone number and date of birth, so our team can reach you about your appointment. It only takes a minute.",
        () => navigate("/onboarding"),
        "Go to Onboarding",
      );
      return;
    }

    if (variants.length > 0 && selectedVariantId === null) {
      showModal(
        "Choose an option",
        "This service comes in several options, each with its own price. Please choose one so we can show you the right total.",
      );
      return;
    }

    let result;

    try {
      result = await createBooking({
        user_id: profile.id,
        service_id,
        service_name,
        nailist_name: selectedNailist.name,
        nailist_id: selectedNailist.id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        variant_id: selectedVariantId,
        addon_ids: selectedAddonIds,
      }, token);
    } catch (err: any) {
      if (err?.status !== 409) {
        showModal(
          "We couldn't reserve your slot",
          err?.message || "Something went wrong while holding your time, so nothing was booked and you have not been charged. Please try again in a moment.",
        );
        return;
      }

      showModal(
        "Existing Appointment",
        err.message || "You already have an appointment waiting for payment. Please pay for it, or let it expire, before booking another. You can find it in My Schedule.",
        () =>
          navigate("/profile", {
            state: { activeTab: "schedule" },
          }),
        "View Appointments",
      );

      return;
    }

    if (!result)
      return showModal(
        "We couldn't reserve your slot",
        "Something went wrong while holding your time, so nothing was booked and you have not been charged. Please try again in a moment.",
      );

    navigate("/payment", {
      state: {
        appointment_id: result.appointment_id,
        service_name,
        service_price: result.total_price ?? selectedPrice ?? 0,
        nailist_name: selectedNailist.name,
        nailist_category_id: selectedNailist.category_id,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        expires_at: result.expires_at,
        status: result.status,
        customer_name: profile.first_name,
      },
    });
  };

  const sectionLabel = "label-caps";

  // Holding the slot takes a moment, so the button shows progress and ignores a second click
  const handleContinue = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitBooking();
    } catch (err) {
      console.error("Booking failed", err);
      showModal(
        "We couldn't reserve your slot",
        "We lost the connection while holding your time, so nothing was booked and you have not been charged. Please check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArtistChange = (id: number) => {
    const found = nailists.find((n) => n.id === id);

    setSelectedNailist(found || null);
    setSelectedDate("");
    setSelectedTime("");
    setBookedSlots([]);
    setTimeSlots([]);
    setFullyBookedDates([]);
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date || !selectedNailist) return;

    const formatted = toLocalDateString(date);

    const slots = await fetchBookedSlotsDetailed(selectedNailist.id, formatted);

    const times = slots.map((s: any) => s.appointment_time);

    if (timeSlots.length === 0) return;
    const fullyBooked = isDayFullyBooked(times);

    if (fullyBooked) {
      showModal("Fully booked", "There are no times left on this day for this artist. Please choose another date.");
      return;
    }

    setSelectedDate(formatted);
    setBookedSlots(times);
    setSelectedTime("");
  };

  const selectedDay = selectedDate ? toLocalDate(selectedDate) : undefined;
  const isDateFullyBooked = (date: Date) => fullyBookedDates.includes(toLocalDateString(date));
  const isSlotBlocked = (slot: string) => isTimeBlocked(slot) || isPastTimeToday(slot);
  const closeModal = () => setModalOpen(false);
  const reloadPage = () => window.location.reload();

  return { priceLabel, pageData, isPageLoading, pageError, nailists, selectedNailist, setSelectedNailist, selectedDate, setSelectedDate, selectedTime, setSelectedTime, timeSlots, setTimeSlots, setBookedSlots, fullyBookedDates, setFullyBookedDates, month, setMonth, modalOpen, setModalOpen, modalTitle, modalMessage, modalAction, modalButtonText, service_category, service_description, service_name, service_image, pricing_type, variants, selectedVariantId, setSelectedVariantId, selectedAddonIds, setSelectedAddonIds, addons, selectedPrice, locationUrl, locationText, isDayFullyBooked, isDisabledDate, toLocalDate, toLocalDateString, isTimeBlocked, isPastTimeToday, formatSlot, showModal, handleContinue, isSubmitting, sectionLabel, handleArtistChange, handleDateSelect, selectedDay, isDateFullyBooked, isSlotBlocked, closeModal, reloadPage };
}
