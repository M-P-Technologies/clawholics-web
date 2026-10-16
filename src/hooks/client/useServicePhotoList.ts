"use client";

import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import type { NailService } from "@/services/serviceService";

/** A service's photos for a carousel: its main photo, then its gallery, each once. The gallery is
 *  the cached public query; until it loads (or if it fails) the main photo alone is shown. */
export function useServicePhotoList(service: NailService): { id: string; image_url: string }[] {
  const gallery = useQuery(publicQueries.serviceGallery(service.id)).data ?? [];
  const urls = [service.image, ...gallery.map((photo) => photo.image_url)].filter((url): url is string => !!url);
  return [...new Set(urls)].map((url) => ({ id: url, image_url: url }));
}
