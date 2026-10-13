import { usePreviewVersion } from "@/lib/cmsPreview";
import { lastSeen } from "../utils/lastSeen";
import { useEffect, useState } from "react";
import { fetchCarousel, type CarouselItem } from "../services/carouselService";
import { fetchAboutContent, type AboutContent } from "../services/aboutService";
import { sanitizeHtml } from "../utils/sanitizeHtml";
import { DAYS_ORDER } from "../data/about";

export function useAbout() {
  const [data, setData] = useState<AboutContent | null>(() => lastSeen("about") ?? null);
  const [copied, setCopied] = useState(false);
  const [gallery, setGallery] = useState<CarouselItem[]>(() => lastSeen("carousel") ?? []);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // In the admin editor's preview, fetch again when the unsaved changes do
  const previewVersion = usePreviewVersion();

  const handleCopyLocation = async () => {
    if (!data) return;

    try {
      await navigator.clipboard.writeText(data.about_location);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  useEffect(() => {
    setError(false);
    fetchAboutContent().then(setData).catch(() => setError(true));
    // The photos are a bonus: the page works without them
    fetchCarousel().then(setGallery).catch(() => setGallery([]));
  }, [attempt, previewVersion]);

  const reload = () => setAttempt((n) => n + 1);

  const aboutHtml = data ? sanitizeHtml(data.about_description) : "";

  // One row per day that has opening hours, with the day name stripped from the time.
  const businessHours = DAYS_ORDER.flatMap((day) => {
    const value = data?.[`about_business_hours_${day}` as keyof AboutContent];
    return value ? [{ day, time: value.replace(day, "").trim() }] : [];
  });

  return { gallery, error, reload, data, copied, handleCopyLocation, aboutHtml, businessHours };
}
