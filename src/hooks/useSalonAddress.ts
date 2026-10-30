"use client";

import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import { withSalonLocation } from "@/lib/homeSections";

/** The salon's address as the site shows it (About Us's, else the Contact page's), or "" until it loads */
export function useSalonAddress(): string {
  const home = useQuery(publicQueries.home()).data;
  const about = useQuery(publicQueries.about()).data;
  return home ? withSalonLocation(home, about ?? null).contact_location : "";
}
