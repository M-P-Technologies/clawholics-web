import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import type { NailService } from "../services/serviceService";
import type { ChangeEvent } from "react";
import { startingPrice } from "../services/pricing";
import { ctaLink, readServicesPage } from "../lib/homeSections";
import { usePagination } from "./usePagination";

export function useServices() {
  const servicesQuery = useQuery(publicQueries.services());
  const contentQuery = useQuery(publicQueries.home());
  // Categories only group the filter chips, so the page still works without them
  const categoriesQuery = useQuery(publicQueries.categories());
  const services = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);
  const categories = categoriesQuery.data ?? [];
  const content = contentQuery.data ?? null;

  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState<string>("");
  // A failed refresh keeps showing the copy already loaded
  const error = (servicesQuery.isError && !servicesQuery.data) || (contentQuery.isError && !contentQuery.data);

  const reload = () => {
    void servicesQuery.refetch();
    void contentQuery.refetch();
    void categoriesQuery.refetch();
  };

  const filtered = useMemo(() => {
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

    return result;
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

  // The page's words and closing banner, as edited in Admin > Services (or the defaults)
  const banner = readServicesPage(content);
  const primary = ctaLink(banner.home_services_cta_primary_link, banner.home_services_cta_primary_label);
  const secondary = ctaLink(banner.home_services_cta_secondary_link, banner.home_services_cta_secondary_label);

  // 9 services a page; a new category or search starts again from the first page, and a new page
  // scrolls back to the top of the list
  const { page, setPage, totalPages, pageItems } = usePagination(cards, `${category}|${search}`);
  const listRef = useRef<HTMLElement>(null);
  const goToPage = (next: number) => {
    setPage(next);
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const query = search.trim();
  const emptyMessage = query
    ? `Nothing matches "${query}". Check the spelling, try a shorter word, or clear the search to see everything.`
    : "There are no services in this category yet. Pick another category to keep browsing.";

  return { resetFilters, cards, error, reload, filtered, content, banner, primary, secondary, category, setCategory, search, setSearch, categoryNames, handleSearchChange, page, totalPages, pageItems, listRef, goToPage, emptyMessage };
}
