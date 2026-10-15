import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/tanstack-query/publicQueries";

/** `photoFor(serviceName)`: the service's main photo, or "" when it has none or the list isn't loaded. */
export function useServicePhotos(): (serviceName: string) => string {
  const list = useQuery(publicQueries.services()).data;
  const photos = useMemo<Record<string, string>>(
    () => Object.fromEntries((list ?? []).filter((s) => s.image).map((s) => [s.name.toLowerCase(), s.image])),
    [list],
  );

  return (serviceName) => photos[serviceName.toLowerCase()] ?? "";
}
