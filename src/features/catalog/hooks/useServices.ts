import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/tanstack-query/publicQueries";
import type { NailService } from "../api/serviceService";
import type { ChangeEvent } from "react";
import { startingPrice } from "../../booking/lib/pricing";

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

  return { resetFilters, cards, error, reload, filtered, content, category, setCategory, search, setSearch, categoryNames, handleSearchChange };
}
