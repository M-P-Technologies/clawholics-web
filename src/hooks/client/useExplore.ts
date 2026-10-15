"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "@/lib/router";
import { useToast } from "@/components/molecules";
import { filterServices } from "../../lib/client/explore";
import { readHomeSections } from "../../lib/homeSections";
import type { ServiceCategory } from "../../services/catalogService";
import type { NailService } from "../../services/serviceService";
import { publicQueries } from "../../lib/publicQueries";
import { useStartBooking } from "../useStartBooking";

const NO_SERVICES: NailService[] = [];
const NO_CATEGORIES: ServiceCategory[] = [];

// The Explore tab: every service, searched and filtered by category, each bookable from its row
export function useExplore() {
  const [params] = useSearchParams();
  const toast = useToast();
  // The cached services, categories and home content the public site reads. Without the categories
  // the filter just lists none; a failed services load shows an error only when there are none yet
  const servicesQuery = useQuery(publicQueries.services());
  const services = servicesQuery.data ?? NO_SERVICES;
  const categories = useQuery(publicQueries.categories()).data ?? NO_CATEGORIES;
  const home = useQuery(publicQueries.home()).data ?? null;
  const loadFailed = servicesQuery.isError && !servicesQuery.data;
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [category, setCategory] = useState(() => params.get("category") ?? "");
  // Inside the app the client is signed in and onboarded, so these notes are rare: a toast is enough
  const startBooking = useStartBooking((title, message, action) => {
    toast.show("error", title, message);
    action?.();
  });

  return {
    subtitle: readHomeSections(home).text.home_explore_subtitle,
    q,
    setQ,
    category,
    /** Picks a category ("" for all) */
    chooseCategory: (name: string) => setCategory(name),
    categories,
    /** The category filter's choices, "All categories" first */
    categoryOptions: [{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c.name, label: c.name }))],
    clear: () => {
      setQ("");
      setCategory("");
    },
    results: filterServices(services, { q, category }),
    loadFailed,
    retry: () => void servicesQuery.refetch(),
    book: (service: NailService) => startBooking(service),
  };
}
