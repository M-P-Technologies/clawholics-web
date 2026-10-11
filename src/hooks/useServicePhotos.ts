import { useEffect, useState } from "react";
import { fetchServices } from "../services/serviceService";

/** `photoFor(serviceName)`: the service's main photo, or "" when it has none or the list isn't loaded. */
export function useServicePhotos(): (serviceName: string) => string {
  const [photos, setPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchServices()
      .then((list) => setPhotos(Object.fromEntries(list.filter((s) => s.image).map((s) => [s.name.toLowerCase(), s.image]))))
      .catch(() => setPhotos({}));
  }, []);

  return (serviceName) => photos[serviceName.toLowerCase()] ?? "";
}
