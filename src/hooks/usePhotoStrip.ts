import { usePreviewVersion } from "@/lib/cmsPreview";
import { useEffect, useState } from "react";
import { fetchNailistGallery, type NailistGalleryImage } from "../services/nailistService";
import { fetchHomeContent } from "../services/contentService";
import { readSocialLinks } from "../lib/socialLinks";
import type { RowPhoto } from "../components/home/PhotoRow";

export interface InstagramLink {
  name: string;
  url: string;
}

/** How many photos the strip shows at most */
const MAX_PHOTOS = 24;

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
  const [items, setItems] = useState<NailistGalleryImage[]>([]);
  const [instagram, setInstagram] = useState<InstagramLink | null>(null);
  // In the admin editor's preview, fetch again after each save
  const previewVersion = usePreviewVersion();
  const ids = nailistIds.join(",");

  useEffect(() => {
    let live = true;
    const list = ids ? ids.split(",").map(Number) : [];
    Promise.all(list.map((id) => fetchNailistGallery(id).then((g) => (Array.isArray(g) ? g : []), () => [])))
      .then((galleries) => {
        if (live) setItems(interleave(galleries));
      });
    return () => {
      live = false;
    };
  }, [ids, previewVersion]);

  useEffect(() => {
    fetchHomeContent()
      .then((content) => {
        // The first Instagram link from Admin > Contact Us
        const link = readSocialLinks(content).find((l) => l.platform === "instagram");
        if (link) setInstagram({ name: link.name || "Instagram", url: link.url });
      })
      .catch(() => setInstagram(null));
  }, [previewVersion]);

  return { photos: items.map((item) => ({ id: item.id, url: item.image_url })), instagram };
}
