"use client";

import { useQuery } from "@tanstack/react-query";
import { adminQueries } from "@/lib/adminQueries";
import type { WorkPhoto } from "./useArtistWorkPhotos";
import { useAdminSession } from "./useAdminSession";

// The nail photos added to visits this artist completed, to choose from for their gallery. None
// for an artist that isn't saved yet, or while nothing is asked for (`enabled` false).
export function useNailistVisitPhotos(nailistId: number | null, enabled = true): { photos: WorkPhoto[]; isLoading: boolean } {
  const { session, ready } = useAdminSession();
  const query = useQuery({ ...adminQueries.nailistVisitPhotos(nailistId ?? 0, session), enabled: ready && enabled && !!nailistId });
  const photos = (query.data ?? []).map((photo) => ({ id: photo.appointment_id, url: photo.url, artist: photo.artist ?? "a completed visit" }));
  return { photos, isLoading: enabled && !!nailistId && query.isPending };
}
