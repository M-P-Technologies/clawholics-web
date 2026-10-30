import "server-only";
import { dehydrate, QueryClient, type DehydratedState, type QueryKey } from "@tanstack/react-query";
import { publicKeys } from "@/lib/publicKeys";
import { publicReads } from "./publicCache";
import { withTimeLimit } from "./timeLimit";

// The public site's shared content, read on the server and handed to TanStack Query (the site
// layout wraps the pages in a HydrationBoundary with it), so the first HTML already holds the
// real page instead of loading placeholders: the browser finds the hero photo at once and nothing
// jumps when the content arrives. The reads are the cached ones the API answers with, so the
// queries start with exactly what they would have fetched; they're tagged `catalog`, so an
// admin's save also rebuilds the pages that used them.
// Whatever fails or is slow is left out, and the page fetches it in the browser as before.

/** The read with the build's time limit (server/timeLimit.ts); a failure is logged and rethrown */
function capped<T>(read: () => Promise<T>): () => Promise<T> {
  return () =>
    withTimeLimit(read, "Public read").catch((error: unknown) => {
      console.warn("Public content left to the browser:", error instanceof Error ? error.message : error);
      throw error;
    });
}

type Seed = [QueryKey, () => Promise<unknown>];

/** Reads each seed on the server and returns them ready for a HydrationBoundary */
async function dehydrated(seeds: Seed[]): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  // prefetchQuery never throws: a failed read is simply not in the dehydrated state
  await Promise.all(seeds.map(([queryKey, read]) => queryClient.prefetchQuery({ queryKey, queryFn: capped(read), retry: false })));
  return dehydrate(queryClient);
}

/** A record that must exist: a missing one is left to the browser, which shows "not found" */
const found = <T>(read: () => Promise<T | null | undefined>) => async () => {
  const value = await read();
  if (value == null) throw new Error("Not found");
  return value;
};

/** What every site page shares (the site layout) */
export function prefetchPublicContent(): Promise<DehydratedState> {
  return dehydrated([
    [publicKeys.home, () => publicReads.content("home")],
    [publicKeys.about, () => publicReads.content("about")],
    [publicKeys.team, () => publicReads.content("team")],
    [publicKeys.services, () => publicReads.services()],
    [publicKeys.categories, () => publicReads.categories()],
    [publicKeys.nailists, () => publicReads.nailists()],
    [publicKeys.faqs, () => publicReads.faqs()],
    [publicKeys.tacs, () => publicReads.tacs()],
    [publicKeys.carousel, () => publicReads.carousel()],
    [publicKeys.paymentSettings, () => publicReads.paymentSettings()],
  ]);
}

/** A service's page: the service and its photos (the list is in the shared content) */
export function prefetchServicePage(id: number): Promise<DehydratedState> {
  return dehydrated([
    [publicKeys.service(id), found(() => publicReads.service(id))],
    [publicKeys.serviceGallery(id), () => publicReads.serviceGallery(id)],
  ]);
}

/** An artist's page: the artist (their gallery comes with the artists section, below) */
export function prefetchArtistPage(id: number): Promise<DehydratedState> {
  return dehydrated([[publicKeys.nailist(id), found(() => publicReads.nailist(id))]]);
}

/**
 * The artists section (the list and each artist's page): every artist's gallery, read in one
 * query and filled in under each artist's own key, so the "Their art" strip doesn't ask once
 * per artist. An artist with no photos gets an empty gallery.
 */
export async function prefetchArtistGalleries(): Promise<DehydratedState> {
  const queryClient = new QueryClient();
  try {
    const [artists, photos] = await capped(() =>
      Promise.all([publicReads.nailists(), publicReads.allNailistGalleries()]),
    )();
    for (const artist of artists as unknown as { id: number }[]) {
      const own = (photos as unknown as { nailist_id: number }[]).filter((p) => p.nailist_id === artist.id);
      queryClient.setQueryData(publicKeys.nailistGallery(artist.id), own);
    }
  } catch {
    // Left to the browser, which asks per artist as before
  }
  return dehydrate(queryClient);
}

/** The privacy policy and terms of use: the legal text, which only those pages need */
export function prefetchLegal(): Promise<DehydratedState> {
  return dehydrated([[publicKeys.legal, () => publicReads.content("legal")]]);
}
