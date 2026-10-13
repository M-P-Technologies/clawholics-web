import { useQueries, useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/publicQueries";
import type { NailistGalleryImage } from "../services/nailistService";
import { readSocialLinks } from "../lib/socialLinks";
import type { RowPhoto } from "../components/home/PhotoRow";

export interface InstagramLink {
  name: string;
  url: string;
}

/** How many photos the strip shows at most */
const MAX_PHOTOS = 24;

const NO_ITEMS: NailistGalleryImage[] = [];

// The strip waits for every gallery, so the photos don't reshuffle as each one arrives. At module
// scope so TanStack can keep its result between renders.
function combineGalleries(results: { isPending: boolean; data?: NailistGalleryImage[] }[]) {
  return results.some((r) => r.isPending) ? NO_ITEMS : interleave(results.map((r) => (Array.isArray(r.data) ? r.data : [])));
}

/** Every artist's photos, taken in turns (each artist's first, then each one's second, ...), so
 *  every artist is near the start rather than the first one filling the strip */
export function interleave(galleries: NailistGalleryImage[][], max = MAX_PHOTOS): NailistGalleryImage[] {
  const longest = Math.max(0, ...galleries.map((g) => g.length));
  const mixed: NailistGalleryImage[] = [];
  for (let i = 0; i < longest; i++) {
    for (const gallery of galleries) if (gallery[i]) mixed.push(gallery[i]);
  }
  return mixed.slice(0, max);
}

// What the Artists page's "Their art" strip needs: the work the artists uploaded to their own
// galleries (Admin > Artists) and our Instagram handle. The strip is a bonus, so a failed request
// just leaves its part empty; an artist whose gallery can't load is left out.
export function usePhotoStrip(nailistIds: number[]): { photos: RowPhoto[]; instagram: InstagramLink | null } {
  const items = useQueries({
    queries: nailistIds.map((id) => publicQueries.nailistGallery(id)),
    combine: combineGalleries,
  });

  const content = useQuery(publicQueries.home()).data;
  // The first Instagram link from Admin > Contact Us
  const link = content ? readSocialLinks(content).find((l) => l.platform === "instagram") : undefined;
  const instagram = link ? { name: link.name || "Instagram", url: link.url } : null;

  return { photos: items.map((item) => ({ id: item.id, url: item.image_url })), instagram };
}
