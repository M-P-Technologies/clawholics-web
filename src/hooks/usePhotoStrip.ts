import { useEffect, useState } from "react";
import { fetchCarousel, type CarouselItem } from "../services/carouselService";
import { fetchHomeContent } from "../services/contentService";
import { lastSeen } from "../utils/lastSeen";
import type { RowPhoto } from "../components/home/PhotoRow";

export interface InstagramLink {
  name: string;
  url: string;
}

// What the photo strip above the footer needs: the admin's Home Carousel photos and our
// Instagram handle. The strip is a bonus, so a failed request just leaves its part empty.
export function usePhotoStrip(): { photos: RowPhoto[]; instagram: InstagramLink | null } {
  const [items, setItems] = useState<CarouselItem[]>(() => lastSeen("carousel") ?? []);
  const [instagram, setInstagram] = useState<InstagramLink | null>(null);

  useEffect(() => {
    fetchCarousel()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));

    fetchHomeContent()
      .then((content) => {
        if (content?.social_instagram_url) {
          setInstagram({ name: content.social_instagram_name || "Instagram", url: content.social_instagram_url });
        }
      })
      .catch(() => setInstagram(null));
  }, []);

  return { photos: items.map((item) => ({ id: item.id, url: item.image_url })), instagram };
}
