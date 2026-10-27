"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { adminQueries } from "@/lib/adminQueries";
import { publicQueries } from "@/lib/publicQueries";
import type { NailistGalleryImage } from "../../services/nailistService";
import { useAdminSession } from "./useAdminSession";

export interface WorkPhoto {
  /** The photo's own gallery id */
  id: number;
  url: string;
  artist: string;
}

// Every photo already in the database from completed visits (the artists' galleries and each
// visit's own photo), to choose from for the Studio gallery instead of uploading another copy
export function useArtistWorkPhotos(): { photos: WorkPhoto[]; isLoading: boolean } {
  const { session, ready } = useAdminSession();
  const artists = useQuery(publicQueries.nailists());
  const visits = useQuery({ ...adminQueries.visitPhotos(session), enabled: ready });
  const list = artists.data ?? [];
  const galleries = useQueries({ queries: list.map((artist) => publicQueries.nailistGallery(artist.id)) });
  const fromGalleries = list.flatMap((artist, i) =>
    ((galleries[i]?.data ?? []) as NailistGalleryImage[]).map((image) => ({ id: image.id, url: image.image_url, artist: artist.name })),
  );
  const fromVisits = (visits.data ?? []).map((photo) => ({ id: -photo.appointment_id, url: photo.url, artist: photo.artist ?? "a completed visit" }));
  const photos = [...fromVisits, ...fromGalleries].filter((p, i, all) => all.findIndex((o) => o.url === p.url) === i);
  return { photos, isLoading: artists.isPending || visits.isPending || galleries.some((g) => g.isPending) };
}
