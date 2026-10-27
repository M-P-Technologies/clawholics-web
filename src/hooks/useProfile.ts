import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser, useAuth } from "@clerk/nextjs";
import { useNavigate, useSearchParams } from "@/lib/router";
import { updateProfile, redeemUserReward, cancelAppointment, isTemporaryFailure, type UserProfile } from "../services/userService";
import { accountKeys, accountQueries } from "@/lib/accountQueries";
import { type Appointment } from "../utils/profile";
import type { ChangeEvent } from "react";
import { isActiveAppointmentStatus } from "../services/proofState";
import { PROFILE_FIELDS, cleanHandle } from "../data/profile";
import { useToast } from "@/components/molecules";
import { pickNext, sortSoonest } from "../utils/profileView";
import { useStampTarget } from "./useStampTarget";
import type { AppointmentView } from "@/types/profile";
import { CLIENT_PATHS } from "../lib/client/clientNav";
import { longDateLabel, timeRangeLabel } from "../lib/timeFormat";

export function useProfile() {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [searchParams] = useSearchParams();

  // After paying, Xendit sends the client to /profile?appointment_id=<id>.
  const highlightedAppointmentId = useMemo(() => {
    const raw = searchParams.get("appointment_id");
    const id = raw ? Number(raw) : NaN;
    return Number.isInteger(id) && id > 0 ? id : null;
  }, [searchParams]);

  const queryClient = useQueryClient();
  const clerkId = clerkUser?.id ?? "";
  const isClient = isLoaded && !!isSignedIn && !!clerkUser && clerkUser.publicMetadata?.role !== "admin";
  // The profile and appointments are the cached queries other screens share (lib/accountQueries),
  // refreshed every 30 seconds, only while this tab is on screen
  const profileQuery = useQuery({ ...accountQueries.profile(clerkId, getToken), enabled: isClient, refetchInterval: 30_000 });
  const appointmentsQuery = useQuery({ ...accountQueries.appointments(clerkId, getToken), enabled: isClient, refetchInterval: 30_000 });
  const dbUser = profileQuery.data ?? null;
  const stamps = dbUser?.stamps ?? 0;
  const stampTarget = useStampTarget();
  const appointments = useMemo(() => appointmentsQuery.data ?? [], [appointmentsQuery.data]);
  // Changes the cached list, e.g. once an appointment is cancelled
  const setAppointments = useCallback(
    (update: (prev: Appointment[]) => Appointment[]) =>
      queryClient.setQueryData<Appointment[]>(accountKeys.appointments(clerkId), (prev) => update(prev ?? [])),
    [queryClient, clerkId],
  );

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isGenderOpen, setIsGenderOpen] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);

  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const [historySortBy, setHistorySortBy] = useState("appointmentDateDesc");
  const [historyFilter, setHistoryFilter] = useState("all");

  const processedPastAppointments = useMemo(() => {
    const filtered = appointments.filter((a) => {
      const s = a.status.toLowerCase();
      const isPastType = ["completed", "cancelled", "refunded"].includes(s);
      if (!isPastType) return false;
      if (historyFilter !== "all" && s !== historyFilter) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (historySortBy === "bookingDateDesc") {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : a.id;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : b.id;
        return timeB - timeA;
      } else if (historySortBy === "appointmentDateDesc") {
        const dateA = new Date(
          `${a.appointment_date}T${a.appointment_time.split("-")[0]}`,
        );
        const dateB = new Date(
          `${b.appointment_date}T${b.appointment_time.split("-")[0]}`,
        );
        return dateB.getTime() - dateA.getTime();
      } else if (historySortBy === "appointmentDateAsc") {
        const dateA = new Date(
          `${a.appointment_date}T${a.appointment_time.split("-")[0]}`,
        );
        const dateB = new Date(
          `${b.appointment_date}T${b.appointment_time.split("-")[0]}`,
        );
        return dateA.getTime() - dateB.getTime();
      }
      return 0;
    });
  }, [appointments, historySortBy, historyFilter]);

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const formatDisplayDate = longDateLabel;

  useEffect(() => {
    if (!isLoaded) return;
    if (clerkUser?.publicMetadata?.role === "admin") navigate("/dashboard", { replace: true });
    else if (!isSignedIn) navigate("/login");
  }, [isLoaded, isSignedIn, clerkUser, navigate]);

  useEffect(() => {
    if (!profileQuery.isError) return;
    // A background refresh that hits a brief outage (the server answers 503 when the database is
    // slow) keeps what is on screen; the next refresh will try again
    if (profileQuery.data !== undefined && isTemporaryFailure(profileQuery.error)) {
      console.warn("Couldn't refresh the account; showing what was loaded before:", profileQuery.error);
    } else {
      console.error("Error fetching data:", profileQuery.error);
    }
  }, [profileQuery.isError, profileQuery.error, profileQuery.data]);

  useEffect(() => {
    if (appointmentsQuery.isError) console.error("Error fetching data:", appointmentsQuery.error);
  }, [appointmentsQuery.isError, appointmentsQuery.error]);

  const handleEditClick = () => {
    setFormData(dbUser);
    setIsEditing(true);
  };

  const genderOptions = [
    { value: "female", label: "Female" },
    { value: "male", label: "Male" },
    { value: "other", label: "Other" },
    { value: "prefer not to say", label: "Prefer not to say" },
  ];

  const handleGenderSelect = (value: string) => {
    if (formData) {
      setFormData({ ...formData, gender: value });
    }
    setIsGenderOpen(false);
  };

  const handleContactMethodSelect = (value: string) => {
    if (formData) setFormData({ ...formData, preferred_contact_method: value });
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (formData) {
      const { name, value } = e.target;

      if (name === "phone") {
        let val = value.replace(/[^\d+]/g, "");

        if (val.indexOf("+") > 0) {
          val = val.replace(/\+/g, "");
        }

        if (val.startsWith("+63")) {
          val = val.slice(0, 13);
        } else if (val.startsWith("09")) {
          val = val.slice(0, 11);
        } else if (val.startsWith("+")) {
          val = val.slice(0, 13);
        } else {
          val = val.slice(0, 11);
        }

        setFormData({ ...formData, [name]: val });
        return;
      }

      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSave = async () => {
    if (formData && clerkUser?.id) {
      const currentFirstName = formData.first_name || "";
      const currentLastName = formData.last_name || "";
      const currentPhone = formData.phone || "";
      const currentDob = formData.dob || "";

      if (currentFirstName.trim() === "") {
        setError("Please enter your first name.");
        return;
      }
      if (currentLastName.trim() === "") {
        setError("Please enter your last name.");
        return;
      }
      if (currentPhone.trim() === "") {
        setError("Please enter your phone number.");
        return;
      }

      const isValid09 =
        currentPhone.startsWith("09") && currentPhone.length === 11;
      const isValid63 =
        currentPhone.startsWith("+639") && currentPhone.length === 13;

      if (!isValid09 && !isValid63) {
        setError(
          "Please enter a valid Philippine phone number (e.g., 09xxxxxxxxx or +639xxxxxxxxx).",
        );
        return;
      }

      if (currentDob.trim() === "") {
        setError("Please select your date of birth.");
        return;
      }

      // The optional contact details; "" clears one
      const contact = {
        alt_phone: (formData.alt_phone ?? "").trim(),
        preferred_contact_method: formData.preferred_contact_method ?? "",
        facebook_handle: cleanHandle("facebook_handle", formData.facebook_handle ?? ""),
        instagram_handle: cleanHandle("instagram_handle", formData.instagram_handle ?? ""),
      };
      if (contact.alt_phone && !/^[+\d\s()-]+$/.test(contact.alt_phone)) {
        setError("Please enter a valid other phone number, or leave it empty.");
        return;
      }

      setError(null);

      try {
        const token = await getToken();

        const formattedPayload = {
          first_name: currentFirstName,
          last_name: currentLastName,
          email: clerkUser.primaryEmailAddress?.emailAddress || formData.email,
          phone: currentPhone,
          dob: currentDob,
          gender: formData.gender || "female",
          ...contact,
        };

        await updateProfile(clerkUser.id, formattedPayload, token);

        queryClient.setQueryData(accountKeys.profile(clerkUser.id), {
          ...dbUser,
          ...formData,
          ...contact,
          first_name: formattedPayload.first_name,
          last_name: formattedPayload.last_name,
        } as UserProfile);

        setIsEditing(false);
        toast.show("success", "Profile updated", "Your new details were saved and are now showing on your profile.");
      } catch {
        setError(
          "We couldn't save your changes. Your edits are still on screen, so nothing is lost. Please check your connection and press Save again.",
        );
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(null);
    setError(null);
  };

  const handleClientRedeem = async () => {
    if (stamps >= stampTarget && clerkUser?.id) {
      try {
        setShowRewardModal(true);
        const key = accountKeys.profile(clerkUser.id);
        queryClient.setQueryData<UserProfile | null>(key, (old) => (old ? { ...old, stamps: 0 } : old));
        const token = await getToken();
        // Use the new authorized client redemption endpoint
        await redeemUserReward(clerkUser.id, token);
        void queryClient.invalidateQueries({ queryKey: key });
      } catch (error) {
        console.error("Failed to self-redeem reward:", error);
        // The stamps weren't used: show them again
        void queryClient.invalidateQueries({ queryKey: accountKeys.profile(clerkUser.id) });
        toast.show(
          "error",
          "We couldn't record your reward",
          "Your stamps are safe. Please show this screen to our staff on your next visit so they can apply your discount, or try again later.",
        );
      }
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppt || !clerkUser?.id) return;
    setActionError(null);

    setIsCancelling(true);

    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token");

      await cancelAppointment(selectedAppt.id, token);
      // The released slot also shows on the booking calendar (fetched fresh there)
      void queryClient.invalidateQueries({ queryKey: accountKeys.appointments(clerkUser.id) });

      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === selectedAppt.id ? { ...appt, status: "Cancelled" } : appt,
        ),
      );
      setIsCancelModalOpen(false);
      toast.show(
        "success",
        "Appointment cancelled",
        `Your ${selectedAppt.service_name} appointment was cancelled and the time slot was released. You can find it under Past & Cancelled Appointments.`,
      );
      setSelectedAppt(null);
    } catch (err) {
      setActionError(
        (err as { message?: string } | null)?.message ||
          "We couldn't cancel this appointment, so it is still active. Please try again, or contact us if this keeps happening.",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const isEligibleForChanges = (dateStr: string, timeStr: string) => {
    try {
      const startTime = timeStr.includes("-")
        ? timeStr.split("-")[0].trim()
        : timeStr.trim();
      // FORCE +08:00 for Philippines to ensure consistent calculation regardless of user's browser timezone
      const aptDate = new Date(`${dateStr}T${startTime}:00+08:00`);
      const now = new Date();

      const diffInMs = aptDate.getTime() - now.getTime();
      const seventyTwoHoursInMs = 72 * 60 * 60 * 1000;

      return diffInMs >= seventyTwoHoursInMs;
    } catch {
      return false;
    }
  };

  const formatSlot = timeRangeLabel;

  const todayIso = new Date().toISOString().split("T")[0];

  // Active appointments together with everything the list needs to show each one.
  const currentAppointments = appointments
    .filter((a) => isActiveAppointmentStatus(a.status))
    .map((appt) => {
      let displayStatus = appt.status;
      let remainingTime = 0;
      let isExpired = false;

      if (appt.status.toLowerCase() === "pending" && appt.expires_at) {
        remainingTime = new Date(appt.expires_at).getTime() - currentTime;

        if (remainingTime <= 0) {
          displayStatus = "Cancelled";
          isExpired = true;
        }
      }

      const isEligible = isEligibleForChanges(appt.appointment_date, appt.appointment_time);
      const canReschedule = displayStatus.toLowerCase() === "confirmed" && isEligible;
      const canCancel = ["pending", "awaiting_proof", "confirmed"].includes(displayStatus.toLowerCase());

      return {
        appt,
        displayStatus,
        remainingTime,
        isExpired,
        canReschedule,
        canCancel,
        // What the card shows, so the page only lays it out
        statusLabel: displayStatus.replace(/_/g, " "),
        dateLabel: formatDisplayDate(appt.appointment_date),
        timeLabel: formatSlot(appt.appointment_time),
        canPay: displayStatus.toLowerCase() === "pending" && !isExpired,
        payLabel: formatTime(remainingTime),
        isLocked: !canReschedule && displayStatus.toLowerCase() === "confirmed",
      };
    });

  const payForAppointment = (appt: Appointment) => {
    if (appt.invoice_url) {
      window.location.href = appt.invoice_url;
    } else {
      navigate(CLIENT_PATHS.payment, {
        state: {
          appointment_id: appt.id,
          service_name: appt.service_name,
          nailist_name: appt.nailist_name,
          appointment_date: appt.appointment_date,
          appointment_time: appt.appointment_time,
          expires_at: appt.expires_at,
          service_price: appt.service_price,
        },
      });
    }
  };

  const rescheduleAppointment = (appt: Appointment) => {
    navigate(CLIENT_PATHS.reschedule, { state: { appointment: appt } });
  };

  const startCancel = (appt: Appointment) => {
    setSelectedAppt(appt);
    setIsCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setActionError(null);
  };

  const handleProofUploaded = (appointmentId: number, proof: Appointment["latest_proof"]) =>
    setAppointments((prev) => prev.map((a) => (a.id === appointmentId ? { ...a, latest_proof: proof } : a)));

  const handleHistoryFilterChange = (e: ChangeEvent<HTMLSelectElement>) => setHistoryFilter(e.target.value);
  const handleHistorySortChange = (e: ChangeEvent<HTMLSelectElement>) => setHistorySortBy(e.target.value);

  // The birthday can't be changed once set (the birthday voucher follows it); the server keeps it too
  const isLocked = (key: string, locked?: boolean) => Boolean(locked) || (key === "dob" && /^\d{4}-\d{2}-\d{2}/.test(dbUser?.dob ?? ""));

  // The details shown in the "My Details" tab: plain text until Edit is pressed, then inputs
  const profileFields = PROFILE_FIELDS.map((field) => ({
    id: field.id,
    name: field.key,
    label: field.label,
    type: field.type,
    autoComplete: field.autoComplete,
    editing: isEditing,
    displayValue: field.key === "dob" ? formatDisplayDate(dbUser?.dob || "") : dbUser?.[field.key],
    value: formData?.[field.key] || "",
    onChange: handleChange,
    disabled: isLocked(field.key, field.locked),
    readOnly: isLocked(field.key, field.locked),
    max: field.key === "dob" ? todayIso : undefined,
  }));

  const isBusy = !isLoaded || clerkUser?.publicMetadata?.role === "admin" || !dbUser;
  const genderLabel = genderOptions.find((option) => option.value === formData?.gender)?.label ?? "";

  // Past appointments as the history list shows them: five at first, all after "View full history"
  const history = processedPastAppointments
    .slice(0, showAllHistory ? undefined : 5)
    .map((appt) => ({
      appt,
      dateLabel: formatDisplayDate(appt.appointment_date),
      timeLabel: formatSlot(appt.appointment_time.replace(" (Cancelled)", "")),
    }));
  const hasMoreHistory = processedPastAppointments.length > 5;
  const noHistory = processedPastAppointments.length === 0;

  // Same shape as the upcoming list, so one card component shows both
  const pastViews: AppointmentView[] = history.map(({ appt, dateLabel, timeLabel }) => ({
    appt,
    displayStatus: appt.status,
    remainingTime: 0,
    isExpired: false,
    canReschedule: false,
    canCancel: false,
    statusLabel: appt.status.replace(/_/g, " "),
    dateLabel,
    timeLabel,
    canPay: false,
    payLabel: "",
    isLocked: false,
  }));
  const upcoming: AppointmentView[] = sortSoonest(currentAppointments);
  const nextAppointment = pickNext(upcoming);

  // The stamp boxes of the loyalty card
  const stampCells = Array.from({ length: stampTarget }, (_, index) => ({ number: index + 1, isEarned: index + 1 <= stamps }));

  // Cancelling a confirmed appointment less than 3 days ahead is not refundable
  const isLateCancellation =
    !!selectedAppt &&
    selectedAppt.status.toLowerCase() === "confirmed" &&
    !isEligibleForChanges(selectedAppt.appointment_date, selectedAppt.appointment_time);
  const selectedApptDateLabel = selectedAppt ? formatDisplayDate(selectedAppt.appointment_date) : "";

  const loyaltyCardNumber = `CLAWHOLICS-2026-${String(dbUser?.id || 0).padStart(4, "0")}`;

  const toggleGender = () => setIsGenderOpen(!isGenderOpen);
  const toggleHistory = () => setShowAllHistory(!showAllHistory);
  const closeRewardModal = () => setShowRewardModal(false);

  // The profile couldn't load (not a missing one) and nothing was loaded before: the client app
  // shows a retry instead of loading forever. A failed background refresh keeps what's on screen.
  const loadError = profileQuery.isError && !profileQuery.data;
  const retryLoad = () => void profileQuery.refetch();

  return { loadError, retryLoad, toggleGender, toggleHistory, closeRewardModal, loyaltyCardNumber, isBusy, genderLabel, history, hasMoreHistory, noHistory, stampCells, stampTarget, isLateCancellation, selectedApptDateLabel, profileFields, isLoaded, clerkUser, getToken, navigate, highlightedAppointmentId, upcoming, nextAppointment, pastViews, dbUser, isEditing, formData, error, appointments, setAppointments, stamps, isGenderOpen, setIsGenderOpen, showRewardModal, setShowRewardModal, selectedAppt, setSelectedAppt, isCancelModalOpen, setIsCancelModalOpen, actionError, setActionError, currentTime, showAllHistory, setShowAllHistory, isCancelling, historySortBy, setHistorySortBy, historyFilter, setHistoryFilter, processedPastAppointments, todayFormatted, formatDisplayDate, handleEditClick, genderOptions, handleGenderSelect, handleContactMethodSelect, formatTime, handleChange, handleSave, handleCancel, handleClientRedeem, handleCancelAppointment, isEligibleForChanges, formatSlot, todayIso, currentAppointments, payForAppointment, rescheduleAppointment, startCancel, closeCancelModal, handleProofUploaded, handleHistoryFilterChange, handleHistorySortChange };
}
