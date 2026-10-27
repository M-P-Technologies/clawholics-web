"use client";

import { useQuery } from "@tanstack/react-query";
import { adminQueries } from "@/lib/adminQueries";
import type { WorkPhoto } from "./useArtistWorkPhotos";
import { useAdminSession } from "./useAdminSession";

// The nail photos added when this service's visits were completed: the only photos the service
// (its strip slide, its photos) can choose from. None for a service that isn't saved yet.
export function useServiceVisitPhotos(serviceId: number | null): { photos: WorkPhoto[]; isLoading: boolean } {
  const { session, ready } = useAdminSession();
  const query = useQuery({ ...adminQueries.serviceVisitPhotos(serviceId ?? 0, session), enabled: ready && !!serviceId });
  const photos = (query.data ?? []).map((photo) => ({ id: photo.appointment_id, url: photo.url, artist: photo.artist ?? "a completed visit" }));
  return { photos, isLoading: !!serviceId && query.isPending };
}
