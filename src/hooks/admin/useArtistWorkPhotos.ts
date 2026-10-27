"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import type { NailistGalleryImage } from "../../services/nailistService";

export interface WorkPhoto {
  /** The photo's own gallery id */
  id: number;
  url: string;
  artist: string;
}

// Every photo already in the artists' galleries (the visit photos), to choose from for the Studio
// gallery instead of uploading another copy
export function useArtistWorkPhotos(): { photos: WorkPhoto[]; isLoading: boolean } {
  const artists = useQuery(publicQueries.nailists());
  const list = artists.data ?? [];
  const galleries = useQueries({ queries: list.map((artist) => publicQueries.nailistGallery(artist.id)) });
  const photos = list.flatMap((artist, i) =>
    ((galleries[i]?.data ?? []) as NailistGalleryImage[]).map((image) => ({ id: image.id, url: image.image_url, artist: artist.name })),
  );
  return { photos, isLoading: artists.isPending || galleries.some((g) => g.isPending) };
}
