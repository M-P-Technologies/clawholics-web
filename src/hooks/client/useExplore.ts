"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "@/lib/router";
import { useToast } from "@/components/molecules";
import { useClientWideLayout } from "../useMinWidth";
import { filterServices } from "../../lib/client/explore";
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
  // The cached services and categories the public site reads. Without the categories
  // the filter just lists none; a failed services load shows an error only when there are none yet
  const servicesQuery = useQuery(publicQueries.services());
  const services = servicesQuery.data ?? NO_SERVICES;
  const categories = useQuery(publicQueries.categories()).data ?? NO_CATEGORIES;
  const loadFailed = servicesQuery.isError && !servicesQuery.data;
  const [q, setQ] = useState(() => params.get("q") ?? "");
  const [category, setCategory] = useState(() => params.get("category") ?? "");
  // The service shown in the panel, as in the Admin Directory: the one clicked, or the first of the list
  // (?service=<id> opens on that one, e.g. from an offer's button)
  const [chosenId, setChosenId] = useState<number | null>(() => Number(params.get("service")) || null);
  // Below `lg` there's no panel beside the list: a clicked row opens the service in a bottom sheet
  const wide = useClientWideLayout();
  const [sheetOpen, setSheetOpen] = useState(() => params.has("service"));
  // Inside the app the client is signed in and onboarded, so these notes are rare: a toast is enough
  const startBooking = useStartBooking((title, message, action) => {
    toast.show("error", title, message);
    action?.();
  });

  const results = filterServices(services, { q, category });

  return {
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
    results,
    /** The service in the panel: the one picked if it's still in the list, else the first */
    selected: results.find((s) => s.id === chosenId) ?? results[0] ?? null,
    /** Shows a service in the panel, or on a phone in the bottom sheet */
    select: (service: NailService) => {
      setChosenId(service.id);
      setSheetOpen(true);
    },
    /** The phone's sheet; it closes by itself when the window widens to show the panel */
    sheetOpen: sheetOpen && !wide,
    closeSheet: () => setSheetOpen(false),
    /** The services haven't arrived yet: show a loading state, not "No services match" */
    loading: servicesQuery.isPending,
    loadFailed,
    retry: () => void servicesQuery.refetch(),
    book: (service: NailService) => startBooking(service),
  };
}
