/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { itemName } from "../../lib/itemName";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { useLocation, useNavigate } from "@/lib/router";
import { useUser, useAuth } from "@clerk/nextjs";
import { createBooking } from "@/services/bookingService";
import { joinWaitlist } from "@/services/waitlistService";
import { BOOKING, bookingQueries } from "@/lib/bookingQueries";
import { useArtistAvailability } from "../useArtistAvailability";
import { useContactHandles } from "./useContactHandles";
import { withSalonLocation } from "@/lib/homeSections";
import { accountKeys, accountQueries } from "@/lib/accountQueries";
import { estimateTotal } from "@/services/pricing";
import { type Nailist, type BookingState, parseTimeRange } from "@/utils/booking";
import { CLIENT_PATHS } from "@/lib/client/clientNav";
import { longDateLabel, timeRangeLabel } from "@/lib/timeFormat";
import { DEFAULT_MIN_NOTICE_HOURS, manilaToday, noticeText, startsTooSoon } from "@/lib/bookingNotice";
import { DEFAULT_MAX_ADVANCE_DAYS, addDays, daysLabel, lastBookableDay, monthsAheadFor } from "@/lib/bookingWindow";

const NO_ANY_DAYS: Record<string, string[]> = {};
const NO_SLOTS: string[] = [];
const service_idOf = (state: { service_id?: number } | null) => state?.service_id ?? 0;

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
  // Instagram/Facebook, asked only when the profile has none, saved as typed
  const { contactFields } = useContactHandles(user?.id, getToken);

  const [selectedNailist, setSelectedNailist] = useState<Nailist | null>(null);
  // "Any available artist": none is chosen, and the salon assigns a free one when the booking is made
  const [anyArtist, setAnyArtist] = useState(false);

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // The notice a booking needs and how far ahead one can be made, set in Admin > Settings (the
  // server enforces them too). Until they load, the defaults, which the server uses when none are saved.
  const bookingSettings = useQuery(publicQueries.bookingSettings());
  const minNotice = bookingSettings.data?.min_notice_hours ?? DEFAULT_MIN_NOTICE_HOURS;
  const maxAdvance = bookingSettings.data?.max_advance_days ?? DEFAULT_MAX_ADVANCE_DAYS;

  // The artist's hours, days off, fully booked days and the chosen day's taken times, shared
  // with the other booking screens (lib/bookingQueries)
  const { timeSlots: artistSlots, dayOffs, customOffs, fullyBookedDates, bookedSlots, isDayFullyBooked, fetchTakenTimes } =
    useArtistAvailability(selectedNailist?.id, selectedDate, maxAdvance);

  // For any artist: the times at least one artist has free, by day, which the server works out
  // (the notice and the window already applied). Without an artist chosen it isn't asked for.
  const anyFrom = manilaToday();
  const anyDaysQuery = useQuery({ ...bookingQueries.anyDays(service_idOf(state), anyFrom, addDays(anyFrom, maxAdvance)), enabled: anyArtist && !!state?.service_id });
  const anyDays = anyDaysQuery.data?.days ?? NO_ANY_DAYS;
  // Days that are open but have nothing free: they can still be picked, to join the waitlist
  const anyFull = anyDaysQuery.data?.full ?? NO_SLOTS;
  // The times to pick from: the chosen artist's, or those free with any artist on the chosen day
  const timeSlots = anyArtist ? (anyDays[selectedDate] ?? NO_SLOTS) : artistSlots;

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

  // The artists who offer the service
  const artistsQuery = useQuery({ ...bookingQueries.artists(service_id), enabled: !!service_id });
  const nailists = useMemo(() => (Array.isArray(artistsQuery.data) ? artistsQuery.data : []), [artistsQuery.data]);
  // Until they arrive, the page says so instead of "No available artists"
  const loadingArtists = artistsQuery.isLoading;

  const priceFor = (isMaster: boolean) =>
    estimateTotal({
      service: { pricing_type, master_price, junior_price, price: flat_price, variants },
      isMaster,
      variantId: selectedVariantId,
      addons,
      addonIds: selectedAddonIds,
    });
  // With any artist the price depends on who is assigned: from the lowest of their rates to the highest
  const anyArtistPrices = anyArtist ? nailists.map((n) => priceFor(n.category_id === 1)).filter((price): price is number => price !== null) : [];
  const lowestPrice = anyArtistPrices.length ? Math.min(...anyArtistPrices) : null;
  const highestPrice = anyArtistPrices.length ? Math.max(...anyArtistPrices) : null;
  const selectedPrice = anyArtist ? lowestPrice : priceFor(selectedNailist?.category_id === 1);

  // The price line of the summary, with the artist's rate when the price depends on the tier
  const priceLabel =
    selectedPrice === null
      ? "Choose an option to see the price"
      : anyArtist
        ? `Starts at ₱${selectedPrice}${highestPrice !== null && highestPrice > selectedPrice ? ` – ₱${highestPrice}, depending on the artist assigned` : ""}`
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

  // Picked once per service, so a refresh of the list doesn't undo the client's choice
  const preselectedFor = useRef<number | null>(null);

  useEffect(() => {
    if (!artistsQuery.data || preselectedFor.current === service_id) return;
    preselectedFor.current = service_id;
    // Coming from an artist's page: that artist is already chosen, if they offer this service
    setSelectedNailist(nailists.find((n: Nailist) => n.id === state?.nailist_id) ?? null);
    setAnyArtist(false);
    setSelectedDate("");
    setSelectedTime("");
  }, [artistsQuery.data, nailists, service_id]);

  const isOverlapping = (a: string, b: string) => {
    const r1 = parseTimeRange(a);
    const r2 = parseTimeRange(b);
    return r1.start < r2.end && r2.start < r1.end;
  };

  const isDisabledDate = (date: Date) => {
    // A day before today in Manila, where the salon is, whatever the visitor's own timezone
    if (toLocalDateString(date) < manilaToday()) return true;

    // Later than the booking window allows
    if (toLocalDateString(date) > lastBookableDay(maxAdvance)) return true;

    // Any artist: a day can be picked when at least one of them has a time free on it, or it's full
    // (open, nothing free: the client can ask to be told if a time opens)
    if (anyArtist) {
      const day = toLocalDateString(date);
      return !anyDays[day]?.length && !anyFull.includes(day);
    }

    if (selectedNailist) {
      if (dayOffs.includes(date.getDay())) return true;

      const formatted = toLocalDateString(date);
      if (customOffs.includes(formatted)) return true;

      // A fully booked day isn't disabled: picking it offers the waitlist

      if (areAllSlotsTooSoon(date)) return true;
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

  // Any artist lists only the times that are free, so none of them is blocked
  const isTimeBlocked = (slot: string) => {
    return !anyArtist && bookedSlots.some((b) => isOverlapping(b, slot));
  };

  /** "Bookings need at least 2 hours' notice and open 30 days ahead." (the notice part left out when there's none) */
  const rulesHint = `Bookings ${minNotice > 0 ? `need at least ${noticeText(minNotice)} and ` : ""}open up to ${daysLabel(maxAdvance)} ahead.`;
  /** What the calendar lets the client page forward to: this month and this many after it */
  const monthsAhead = monthsAheadFor(maxAdvance);

  // A time that has started, or starts sooner than the notice allows, in Manila time
  const isTooSoon = (slot: string) => !!selectedDate && startsTooSoon(selectedDate, slot, minNotice);

  const areAllSlotsTooSoon = (date: Date) => {
    const day = toLocalDateString(date);
    return timeSlots.length > 0 && timeSlots.every((slot) => startsTooSoon(day, slot, minNotice));
  };

  const formatSlot = timeRangeLabel;

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

    if ((!selectedNailist && !anyArtist) || !selectedDate || !selectedTime) {
      showModal(
        "Almost there",
        "Please choose an artist, a date and a time before continuing. Anything still showing a dash in your Booking summary is missing.",
      );
      return;
    }

    // A chosen artist's time is checked again now; for any artist the server picks one who's free
    if (selectedNailist) {
      const latest = await fetchTakenTimes(selectedDate);
      const conflict = latest.some((taken) => isOverlapping(selectedTime, taken));
      if (conflict) {
        showModal(
          "Slot Unavailable",
          `Someone else just reserved ${itemName(selectedNailist.name, "this artist")} at ${timeRangeLabel(selectedTime)} on ${longDateLabel(selectedDate)}. Your other choices are kept, so please pick a different time to continue.`,
        );
        setSelectedTime("");
        return;
      }
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
        `${itemName(service_name, "This service")} comes in several options, each with its own price. Please choose one so we can show you the right total.`,
      );
      return;
    }

    let result;

    try {
      result = await createBooking({
        user_id: profile.id,
        service_id,
        service_name,
        nailist_name: selectedNailist?.name ?? "",
        nailist_id: selectedNailist?.id ?? null,
        ...(anyArtist ? { any_artist: true } : {}),
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        variant_id: selectedVariantId,
        addon_ids: selectedAddonIds,
      }, await getToken());
      // The new booking shows on the client's profile
      void queryClient.invalidateQueries({ queryKey: accountKeys.appointments(user.id) });
    } catch (err: any) {
      // The time went to someone else meanwhile (for any artist: to every artist): the times are asked for again
      if (err?.code === "SLOT_TAKEN") {
        void queryClient.invalidateQueries({ queryKey: [BOOKING] });
        setSelectedTime("");
        showModal("Slot Unavailable", `${err.message || "That time was just taken."} Your other choices are kept, so please pick a different time to continue.`);
        return;
      }
      if (err?.status !== 409) {
        showModal(
          "We couldn't reserve your slot",
          err?.message || `Something went wrong while holding ${itemName(selectedNailist?.name, "your artist")} for your ${itemName(service_name, "service")}, so nothing was booked and you have not been charged. Please try again in a moment.`,
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
        `Something went wrong while holding ${itemName(selectedNailist?.name, "your artist")} for your ${itemName(service_name, "service")}, so nothing was booked and you have not been charged. Please try again in a moment.`,
      );

    navigate(CLIENT_PATHS.payment, {
      state: {
        appointment_id: result.appointment_id,
        service_name,
        service_price: result.total_price ?? selectedPrice ?? 0,
        // For any artist, the one the salon assigned (the server says who)
        nailist_name: result.nailist_name ?? selectedNailist?.name ?? "",
        nailist_category_id: result.nailist_category_id ?? selectedNailist?.category_id,
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
        `We lost the connection while holding ${itemName(selectedNailist?.name, "your time")} for your ${itemName(service_name, "service")}, so nothing was booked and you have not been charged. Please check your connection and try again.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // A fully booked day: say so, and offer an email if a time opens up on it
  const offerWaitlist = (what: string, date: string) =>
    showModal(
      "Fully booked",
      `${what} on ${longDateLabel(date)}. Would you like an email if a time opens up? You can also choose another date.`,
      () => void joinWaiting(date),
      "Notify me",
    );

  const joinWaiting = async (date: string) => {
    if (!isSignedIn || !user) {
      showModal("Login Required", "Please log in so we know where to send the email, then come back and ask again.", () => navigate("/login"), "Go to Login");
      return;
    }
    try {
      const joined = await joinWaitlist({ service_id, nailist_id: selectedNailist?.id ?? null, date }, await getToken());
      showModal(
        joined.already ? "You're already on the list" : "You're on the list",
        `We'll email you if a time opens up on ${longDateLabel(date)}. Times go quickly once they do, so keep an eye on your inbox.`,
      );
    } catch (err: any) {
      // The day has times after all (someone cancelled): the calendar asks for them again
      if (err?.code === "NOT_FULL") void queryClient.invalidateQueries({ queryKey: [BOOKING] });
      showModal("We couldn't add you", err?.message || "Please try again in a moment.");
    }
  };

  /** A chosen artist's id, or "any" for any available artist */
  const handleArtistChange = (choice: number | "any") => {
    const found = choice === "any" ? undefined : nailists.find((n) => n.id === choice);

    setAnyArtist(choice === "any");
    setSelectedNailist(found || null);
    setSelectedDate("");
    setSelectedTime("");
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date || (!selectedNailist && !anyArtist)) return;

    const formatted = toLocalDateString(date);

    // Any artist: the server knows which days have a time free, and which are full
    if (anyArtist) {
      if (anyFull.includes(formatted)) {
        offerWaitlist("None of our artists has a time left", formatted);
        return;
      }
      setSelectedDate(formatted);
      setSelectedTime("");
      return;
    }

    const times = await fetchTakenTimes(formatted);

    if (timeSlots.length === 0) return;
    const fullyBooked = isDayFullyBooked(times);

    if (fullyBooked) {
      offerWaitlist(`${itemName(selectedNailist?.name, "This artist")} has no times left`, formatted);
      return;
    }

    // The day's taken times are now cached for its time list
    setSelectedDate(formatted);
    setSelectedTime("");
  };

  const selectedDay = selectedDate ? toLocalDate(selectedDate) : undefined;
  const isDateFullyBooked = (date: Date) => (anyArtist ? anyFull : fullyBookedDates).includes(toLocalDateString(date));
  /** "Any available artist" is offered when more than one artist does the service */
  const canChooseAnyArtist = nailists.length > 1;
  /** The artist for the summary: the one chosen, "Any available artist", or a dash */
  const artistLabel = anyArtist ? "Any available artist" : selectedNailist?.name ?? "-";
  /** Waiting for the times free with any artist */
  const loadingAnyDays = anyArtist && anyDaysQuery.isPending;
  const isSlotBlocked = (slot: string) => isTimeBlocked(slot) || isTooSoon(slot);
  const closeModal = () => setModalOpen(false);
  const reloadPage = () => window.location.reload();

  return { anyArtist, canChooseAnyArtist, artistLabel, loadingAnyDays, priceLabel, pageData, isPageLoading, pageError, nailists, loadingArtists, selectedNailist, setSelectedNailist, selectedDate, setSelectedDate, selectedTime, setSelectedTime, timeSlots, fullyBookedDates, month, setMonth, modalOpen, setModalOpen, modalTitle, modalMessage, modalAction, modalButtonText, service_category, service_description, service_name, service_image, pricing_type, variants, selectedVariantId, setSelectedVariantId, selectedAddonIds, setSelectedAddonIds, addons, selectedPrice, locationUrl, locationText, isDayFullyBooked, isDisabledDate, toLocalDate, toLocalDateString, isTimeBlocked, isTooSoon, rulesHint, monthsAhead, formatSlot, showModal, handleContinue, isSubmitting, handleArtistChange, handleDateSelect, selectedDay, isDateFullyBooked, isSlotBlocked, closeModal, reloadPage, contactFields };
}
