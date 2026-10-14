"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { CLIENT_PATHS } from "../../lib/client/clientNav";
import { homeOffers } from "../../lib/client/offers";
import { readHomeSections } from "../../lib/homeSections";
import { fetchHomeContent } from "../../services/contentService";
import { fetchServices, type NailService } from "../../services/serviceService";
import { lastSeen } from "../../utils/lastSeen";
import { useServicePhotos } from "../useServicePhotos";
import { useMyAccount } from "./useMyAccount";

const POPULAR_COUNT = 8;

// The Home tab: the greeting, search, popular services (in the admin's order), offers, next visit
export function useClientHome() {
  const account = useMyAccount();
  const navigate = useNavigate();
  const photoFor = useServicePhotos();
  const [services, setServices] = useState<NailService[]>(() => lastSeen<NailService[]>("services") ?? []);
  const [home, setHome] = useState<object | null>(() => lastSeen<object>("home") ?? null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // Each section shows what it has: a failed load leaves it as it was, not an error page
    fetchServices().then(setServices, () => {});
    fetchHomeContent().then(setHome, () => {});
  }, []);

  const firstName = account.dbUser?.first_name || account.clerkUser?.firstName || "";

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
    offers: homeOffers({ sections: readHomeSections(home), dob: account.dbUser?.dob, firstName, now: account.currentTime }),
  };
}
