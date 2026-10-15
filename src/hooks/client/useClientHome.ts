"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@/lib/router";
import { useToast } from "@/components/molecules";
import { CLIENT_PATHS } from "../../lib/client/clientNav";
import { completedVisits } from "../../lib/client/appointments";
import { clientTrackerSteps } from "../../lib/client/tracker";
import { relativeDay, statusDotTone } from "../../utils/profileView";
import { homeOffers } from "../../lib/client/offers";
import { readHomeSections } from "../../lib/homeSections";
import type { NailService } from "../../services/serviceService";
import { publicQueries } from "../../lib/publicQueries";
import { useBirthdayVoucher } from "../useBirthdayVoucher";
import { useServicePhotos } from "../useServicePhotos";
import { useStartBooking } from "../useStartBooking";
import { useMyAccount } from "./useMyAccount";

const POPULAR_COUNT = 8;

// The Home tab: the greeting, search, popular services (in the admin's order), offers, next visit
const NO_SERVICES: NailService[] = [];

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
  // The cached services and home content the public site reads. Each section shows what it has:
  // a failed load leaves it as it was, not an error page
  const services = useQuery(publicQueries.services()).data ?? NO_SERVICES;
  const home = useQuery(publicQueries.home()).data ?? null;
  const [query, setQuery] = useState("");

  const firstName = account.dbUser?.first_name || account.clerkUser?.firstName || "";
  const next = account.nextAppointment;

  // This month's birthday voucher, if the client has one: claim it, or show its code
  const birthday = useBirthdayVoucher();

  return {
    account,
    birthdayVoucher: birthday.voucher,
    claimVoucher: () => birthday.claim().catch(() => {}),
    claimingVoucher: birthday.isClaiming,
    voucherError: birthday.claimError?.message,
    photoFor,
    firstName,
    greeting: firstName ? `Hi, ${firstName}` : "Hi there",
    /** The upcoming appointment, and its status badge's colour */
    next,
    nextStatusTone: next ? statusDotTone(next.displayStatus) : undefined,
    query,
    setQuery,
    search: () => {
      const q = query.trim();
      navigate(q ? `${CLIENT_PATHS.explore}?q=${encodeURIComponent(q)}` : CLIENT_PATHS.explore);
    },
    popular: services.slice(0, POPULAR_COUNT),
    book: (service: NailService) => startBooking(service),
    /** Completed visits */
    visits: completedVisits(account.appointments),
    /** "4 / 10": the stamps on the card, capped at the salon's target */
    stampsValue: `${Math.min(account.stamps, account.stampTarget)} / ${account.stampTarget}`,
    nextVisitLabel: next ? next.dateLabel : "None booked",
    /** Under the next appointment: the payment countdown while the hold runs, or how far away it is */
    nextWhen: next ? (next.canPay ? `Pay within ${next.payLabel}` : relativeDay(next.appt.appointment_date, next.appt.appointment_time, account.currentTime)) : "",
    trackerSteps: next ? clientTrackerSteps(next.appt) : [],
    offers: homeOffers({ sections: readHomeSections(home), dob: account.dbUser?.dob, firstName, now: account.currentTime }),
  };
}
