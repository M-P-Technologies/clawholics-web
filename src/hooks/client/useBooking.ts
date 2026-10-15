/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { useLocation, useNavigate } from "@/lib/router";
import { useUser, useAuth } from "@clerk/nextjs";
import { createBooking } from "@/services/bookingService";
import { bookingQueries } from "@/lib/bookingQueries";
import { useArtistAvailability } from "../useArtistAvailability";
import { withSalonLocation } from "@/lib/homeSections";
import { accountKeys, accountQueries } from "@/lib/accountQueries";
import { estimateTotal } from "@/services/pricing";
import { type Nailist, type BookingState, parseTimeRange } from "@/utils/booking";
import { CLIENT_PATHS } from "@/lib/client/clientNav";

export function useBooking() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const state = location.state as BookingState | null;

  const homeQuery = useQuery(publicQueries.home());
  const aboutQuery = useQuery(publicQueries.about());
  const home = homeQuery.data;
  const about = aboutQuery.data;
  // The address and map link are edited in About Us; the page waits for them, but works without
  const aboutSettled = !aboutQuery.isPending;
  const pageData = useMemo(
    () => (home && aboutSettled ? withSalonLocation(home, about ?? null) : null),
    [home, about, aboutSettled],
  );
  // A failed refresh keeps showing the copy already loaded
  const pageError = homeQuery.isError && !home ? "Failed to load location." : "";
  const isPageLoading = !pageData && !pageError;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedNailist, setSelectedNailist] = useState<Nailist | null>(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // The artist's hours, days off, fully booked days and the chosen day's taken times, shared
  // with the other booking screens (lib/bookingQueries)
  const { timeSlots, dayOffs, customOffs, fullyBookedDates, bookedSlots, isDayFullyBooked, fetchTakenTimes } =
    useArtistAvailability(selectedNailist?.id, selectedDate);

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

  // The category's add-ons; without the categories, there are none to offer
  const categories = useQuery(publicQueries.categories()).data ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);

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
    if (!state) navigate(CLIENT_PATHS.explore);
  }, [state, navigate]);

  // The artists who offer the service
  const artistsQuery = useQuery({ ...bookingQueries.artists(service_id), enabled: !!service_id });
  const nailists = useMemo(() => (Array.isArray(artistsQuery.data) ? artistsQuery.data : []), [artistsQuery.data]);
  // Picked once per service, so a refresh of the list doesn't undo the client's choice
  const preselectedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!artistsQuery.data || preselectedFor.current === service_id) return;
    preselectedFor.current = service_id;
    // Coming from an artist's page: that artist is already chosen, if they offer this service
    setSelectedNailist(nailists.find((n: Nailist) => n.id === state?.nailist_id) ?? null);
    setSelectedDate("");
    setSelectedTime("");
  }, [artistsQuery.data, nailists, service_id]);

  const isOverlapping = (a: string, b: string) => {
    const r1 = parseTimeRange(a);
    const r2 = parseTimeRange(b);
    return r1.start < r2.end && r2.start < r1.end;
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

    const latest = await fetchTakenTimes(selectedDate);

    const conflict = latest.some((taken) => isOverlapping(selectedTime, taken));

    if (conflict) {
      showModal(
        "Slot Unavailable",
        "Someone else just reserved that time. Your other choices are kept, so please pick a different time to continue.",
      );
      setSelectedTime("");
      return;
    }

    // The cached profile, asked for again only when it's no longer fresh
    const profile = await queryClient.fetchQuery(accountQueries.profile(user.id, getToken));

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
      }, await getToken());
      // The new booking shows on the client's profile
      void queryClient.invalidateQueries({ queryKey: accountKeys.appointments(user.id) });
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
          navigate(CLIENT_PATHS.appointments),
        "View Appointments",
      );

      return;
    }

    if (!result)
      return showModal(
        "We couldn't reserve your slot",
        "Something went wrong while holding your time, so nothing was booked and you have not been charged. Please try again in a moment.",
      );

    navigate(CLIENT_PATHS.payment, {
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
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date || !selectedNailist) return;

    const formatted = toLocalDateString(date);

    const times = await fetchTakenTimes(formatted);

    if (timeSlots.length === 0) return;
    const fullyBooked = isDayFullyBooked(times);

    if (fullyBooked) {
      showModal("Fully booked", "There are no times left on this day for this artist. Please choose another date.");
      return;
    }

    // The day's taken times are now cached for its time list
    setSelectedDate(formatted);
    setSelectedTime("");
  };

  const selectedDay = selectedDate ? toLocalDate(selectedDate) : undefined;
  const isDateFullyBooked = (date: Date) => fullyBookedDates.includes(toLocalDateString(date));
  const isSlotBlocked = (slot: string) => isTimeBlocked(slot) || isPastTimeToday(slot);
  const closeModal = () => setModalOpen(false);
  const reloadPage = () => window.location.reload();

  return { priceLabel, pageData, isPageLoading, pageError, nailists, selectedNailist, setSelectedNailist, selectedDate, setSelectedDate, selectedTime, setSelectedTime, timeSlots, fullyBookedDates, month, setMonth, modalOpen, setModalOpen, modalTitle, modalMessage, modalAction, modalButtonText, service_category, service_description, service_name, service_image, pricing_type, variants, selectedVariantId, setSelectedVariantId, selectedAddonIds, setSelectedAddonIds, addons, selectedPrice, locationUrl, locationText, isDayFullyBooked, isDisabledDate, toLocalDate, toLocalDateString, isTimeBlocked, isPastTimeToday, formatSlot, showModal, handleContinue, isSubmitting, handleArtistChange, handleDateSelect, selectedDay, isDateFullyBooked, isSlotBlocked, closeModal, reloadPage };
}
