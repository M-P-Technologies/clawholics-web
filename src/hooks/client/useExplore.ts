"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "@/lib/router";
import { useToast } from "@/components/molecules";
import { filterServices } from "../../lib/client/explore";
import { readHomeSections } from "../../lib/homeSections";
import { fetchCategories, type ServiceCategory } from "../../services/catalogService";
import { fetchHomeContent } from "../../services/contentService";
import { fetchServices, type NailService } from "../../services/serviceService";
import { lastSeen } from "../../utils/lastSeen";
import { useStartBooking } from "../useStartBooking";

// The Explore tab: every service, searched and filtered by category, each bookable from its row
export function useExplore() {
  const [params] = useSearchParams();
  const toast = useToast();
  const [services, setServices] = useState<NailService[]>(() => lastSeen<NailService[]>("services") ?? []);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [home, setHome] = useState<object | null>(() => lastSeen<object>("home") ?? null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [category, setCategory] = useState(() => params.get("category") ?? "");
  const [filterOpen, setFilterOpen] = useState(false);
  // Inside the app the client is signed in and onboarded, so these notes are rare: a toast is enough
  const startBooking = useStartBooking((title, message, action) => {
    toast.show("error", title, message);
    action?.();
  });

  useEffect(() => {
    setLoadFailed(false);
    fetchServices().then(setServices, () => setLoadFailed(true));
    fetchCategories().then(setCategories, () => setCategories([]));
    fetchHomeContent().then(setHome, () => {});
  }, [attempt]);

  return {
    subtitle: readHomeSections(home).text.home_explore_subtitle,
    q,
    setQ,
    category,
    setCategory: (name: string) => setCategory((current) => (current === name ? "" : name)),
    categories,
    filterOpen,
    toggleFilter: () => setFilterOpen((open) => !open),
    clear: () => {
      setQ("");
      setCategory("");
    },
    results: filterServices(services, { q, category }),
    loadFailed,
    retry: () => setAttempt((n) => n + 1),
    book: (service: NailService) => startBooking(service),
  };
}
