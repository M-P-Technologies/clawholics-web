"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { useToast } from "@/components/molecules";
import { CLIENT_PATHS } from "../../lib/client/clientNav";
import { isCompleted } from "../../lib/client/appointments";
import { clientTrackerSteps } from "../../lib/client/tracker";
import { relativeDay } from "../../utils/profileView";
import { homeOffers } from "../../lib/client/offers";
import { readHomeSections } from "../../lib/homeSections";
import { fetchHomeContent } from "../../services/contentService";
import { fetchServices, type NailService } from "../../services/serviceService";
import { lastSeen } from "../../utils/lastSeen";
import { useServicePhotos } from "../useServicePhotos";
import { useStartBooking } from "../useStartBooking";
import { useMyAccount } from "./useMyAccount";

const POPULAR_COUNT = 8;

// The Home tab: the greeting, search, popular services (in the admin's order), offers, next visit
export function useClientHome() {
  const account = useMyAccount();
  const navigate = useNavigate();
  const photoFor = useServicePhotos();
  const toast = useToast();
  // Inside the app the client is signed in and onboarded, so these notes are rare: a toast is enough
  const startBooking = useStartBooking((title, message, action) => {
    toast.show("error", title, message);
    action?.();
  });
  const [services, setServices] = useState<NailService[]>(() => lastSeen<NailService[]>("services") ?? []);
  const [home, setHome] = useState<object | null>(() => lastSeen<object>("home") ?? null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // Each section shows what it has: a failed load leaves it as it was, not an error page
    fetchServices().then(setServices, () => {});
    fetchHomeContent().then(setHome, () => {});
  }, []);

  const firstName = account.dbUser?.first_name || account.clerkUser?.firstName || "";
  const next = account.nextAppointment;

  return {
    account,
    photoFor,
    firstName,
    query,
    setQuery,
    search: () => {
      const q = query.trim();
      navigate(q ? `${CLIENT_PATHS.explore}?q=${encodeURIComponent(q)}` : CLIENT_PATHS.explore);
    },
    popular: services.slice(0, POPULAR_COUNT),
    book: (service: NailService) => startBooking(service),
    /** Completed visits */
    visits: account.pastViews.filter(isCompleted).length,
    nextVisitLabel: next ? next.dateLabel : "None booked",
    /** Under the next appointment: the payment countdown while the hold runs, or how far away it is */
    nextWhen: next ? (next.canPay ? `Pay within ${next.payLabel}` : relativeDay(next.appt.appointment_date, next.appt.appointment_time, account.currentTime)) : "",
    trackerSteps: next ? clientTrackerSteps(next.appt) : [],
    offers: homeOffers({ sections: readHomeSections(home), dob: account.dbUser?.dob, firstName, now: account.currentTime }),
  };
}
