import { usePreviewVersion } from "@/lib/cmsPreview";
import { lastSeen } from "../utils/lastSeen";
import { useEffect, useState } from "react";
import { fetchServices } from "../services/serviceService";
import { fetchHomeContent } from "../services/contentService";
import type { HomeContent } from "../types";
import type { NailService } from "../services/serviceService";
import { fetchCategories, type ServiceCategory } from "../services/catalogService";
import type { ChangeEvent } from "react";
import { startingPrice } from "../services/pricing";

export function useServices() {
  const [services, setServices] = useState<NailService[]>(() => lastSeen("services") ?? []);
  const [filtered, setFiltered] = useState<NailService[]>(() => lastSeen("services") ?? []);
  const [categories, setCategories] = useState<ServiceCategory[]>(() => lastSeen("categories") ?? []);
  const [content, setContent] = useState<HomeContent | null>(() => lastSeen("home") ?? null);

  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // In the admin editor's preview, fetch again when the unsaved changes do
  const previewVersion = usePreviewVersion();

  useEffect(() => {
    setError(false);

    fetchServices()
      .then((data) => {
        setServices(data);
        setFiltered(data);
      })
      .catch(() => setError(true));

    fetchHomeContent().then(setContent).catch(() => setError(true));
    // Categories only group the filter chips, so the page still works without them
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, [attempt, previewVersion]);

  const reload = () => setAttempt((n) => n + 1);

  useEffect(() => {
    let result: NailService[] = services;

    if (category !== "All") {
      result = result.filter(
        (s) => s.category.toLowerCase() === category.toLowerCase(),
      );
    }

    if (search.trim() !== "") {
      result = result.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase()),
      );
    }

    setFiltered(result);
  }, [category, search, services]);

  const categoryNames = [
    "All",
    ...categories
      .filter((c) => services.some((s) => s.category === c.name))
      .map((c) => c.name),
  ];

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value);

  // Each service with the price line its card shows
  const cards = filtered.map((service) => {
    const from = startingPrice(service);
    return { ...service, priceLabel: from !== null ? `From ₱${from}` : "Price on request" };
  });

  const resetFilters = () => {
    setSearch("");
    setCategory("All");
  };

  return { resetFilters, cards, error, reload, filtered, content, category, setCategory, search, setSearch, categoryNames, handleSearchChange };
}
