import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/tanstack-query/publicQueries";
import type { AboutContent } from "../api/aboutService";
import { sanitizeHtml } from "../../../lib/sanitizeHtml";
import { DAYS_ORDER } from "../lib/about";

export function useAbout() {
  const aboutQuery = useQuery(publicQueries.about());
  const data = aboutQuery.data ?? null;
  // The photos are a bonus: the page works without them
  const gallery = useQuery(publicQueries.carousel()).data ?? [];
  // A failed refresh keeps showing the copy already loaded
  const error = aboutQuery.isError && !data;
  const [copied, setCopied] = useState(false);

  const handleCopyLocation = async () => {
    if (!data) return;

    try {
      await navigator.clipboard.writeText(data.about_location);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const reload = () => {
    void aboutQuery.refetch();
  };

  const aboutHtml = data ? sanitizeHtml(data.about_description) : "";

  // One row per day that has opening hours, with the day name stripped from the time.
  const businessHours = DAYS_ORDER.flatMap((day) => {
    const value = data?.[`about_business_hours_${day}` as keyof AboutContent];
    return value ? [{ day, time: value.replace(day, "").trim() }] : [];
  });

  return { gallery, error, reload, data, copied, handleCopyLocation, aboutHtml, businessHours };
}
