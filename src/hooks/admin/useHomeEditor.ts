"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "@/components/molecules";
import { EMPTY_HOME_CONTENT, normalizeHomeContent, trimHomeSections } from "../../lib/admin/homeEditor";
import { homeSectionsProblem, homeSectionsToContent, readHomeSections, type HomeFeature, type HomeOffer, type HomeSections, type HomeTextKey, type StripSlide } from "../../lib/homeSections";
import { fetchHomeContent, updateHomeContent, type HomeCMSContent } from "../../services/contentService";
import { fetchServices, type NailService } from "../../services/serviceService";
import { PHOTO_UPLOAD_OPTIONS, uploadImage } from "../../services/uploadService";

/** The two pictures kept with the sections rather than as plain content keys */
type SectionImage = "offerImage" | "footerLogo";

// The Homepage editor: the home content and its sections (words, cards, strip, look), loaded,
// edited and saved together, and the photo uploads
export function useHomeEditor() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [content, setContent] = useState<HomeCMSContent>(EMPTY_HOME_CONTENT);
  const [sections, setSections] = useState<HomeSections>(() => readHomeSections(null));
  const [saved, setSaved] = useState({ content: EMPTY_HOME_CONTENT, sections: readHomeSections(null) });
  const [services, setServices] = useState<NailService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const apply = (contentData: Record<string, string>) => {
    const next = { content: normalizeHomeContent(contentData), sections: readHomeSections(contentData) };
    setContent(next.content);
    setSections(next.sections);
    setSaved(next);
  };

  useEffect(() => {
    (async () => {
      try {
        const [contentData, serviceData] = await Promise.all([fetchHomeContent(), fetchServices().catch(() => [])]);
        apply(contentData);
        setServices(serviceData);
        setLoadFailed(false);
      } catch (error) {
        console.warn("Couldn't load the homepage content:", error);
        setLoadFailed(true);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [attempt]);

  const set = (key: keyof HomeCMSContent) => (value: string) => setContent((prev) => ({ ...prev, [key]: value }));
  const setSectionImage = (key: SectionImage, url: string) => setSections((prev) => ({ ...prev, [key]: url }));

  /** Uploads a photo, marking its slot busy meanwhile; null (with a message) when it fails */
  const upload = async (slot: string, file: File) => {
    setUploading((prev) => ({ ...prev, [slot]: true }));
    try {
      const data = await uploadImage(file, "content", null, null, PHOTO_UPLOAD_OPTIONS);
      if (!data?.imageUrl) throw new Error("No image URL returned.");
      return data.imageUrl;
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.show("error", "Photo not uploaded", "We couldn't upload that photo. Please check that it is an image file and try again.");
      return null;
    } finally {
      setUploading((prev) => ({ ...prev, [slot]: false }));
    }
  };

  const save = async () => {
    // The Services page subtitle is edited (and saved) in Services, so it isn't sent from here,
    // where it could put back an older value
    const trimmedContent = Object.fromEntries(
      Object.entries(content)
        .filter(([key]) => key !== "home_services_subtitle")
        .map(([key, value]) => [key, value.trim()]),
    );
    const trimmedSections = trimHomeSections(sections);
    if (Object.values(trimmedContent).some((value) => !value)) {
      toast.show("error", "Some fields are empty", "Please fill in every field before saving. Nothing was saved.");
      return;
    }
    const problem = homeSectionsProblem(trimmedSections);
    if (problem) {
      toast.show("error", "Please check the form", `${problem} Nothing was saved.`);
      return;
    }
    try {
      setIsSaving(true);
      const token = await getToken();
      await updateHomeContent({ ...trimmedContent, ...homeSectionsToContent(trimmedSections) }, token, currentUser?.id);
      apply(await fetchHomeContent());
      setRefreshKey((n) => n + 1);
      toast.show("success", "Homepage saved", "Your changes are now live on the website.");
    } catch (error) {
      console.error("Failed to save homepage content:", error);
      toast.show("error", "Changes not saved", "We couldn't save your changes, so the website still shows the previous version. Your edits are still on screen. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isLoading,
    loadFailed,
    retry: () => {
      setIsLoading(true);
      setAttempt((n) => n + 1);
    },
    content,
    sections,
    services,
    set,
    setText: (key: HomeTextKey) => (value: string) => setSections((prev) => ({ ...prev, text: { ...prev.text, [key]: value } })),
    setFeature: (index: number, field: keyof HomeFeature) => (value: string) =>
      setSections((prev) => ({ ...prev, features: prev.features.map((f, i) => (i === index ? { ...f, [field]: value } : f)) })),
    setStrip: (strip: StripSlide[] | null) => setSections((prev) => ({ ...prev, strip })),
    setOffers: (offers: HomeOffer[]) => setSections((prev) => ({ ...prev, offers })),
    uploading,
    upload,
    /** Uploads a photo into one of the plain content keys */
    uploadTo: (key: keyof HomeCMSContent) => async (file: File) => {
      const url = await upload(key, file);
      if (url) set(key)(url);
    },
    /** Uploads the emblem or the footer logo */
    uploadSectionImage: (key: SectionImage) => async (file: File) => {
      const url = await upload(key, file);
      if (url) setSectionImage(key, url);
    },
    clearSectionImage: (key: SectionImage) => () => setSectionImage(key, ""),
    /** What the preview shows: the form as it stands, as home content */
    draft: { ...content, ...homeSectionsToContent(sections) },
    busy: Object.values(uploading).some(Boolean),
    dirty: JSON.stringify({ content, sections }) !== JSON.stringify(saved),
    isSaving,
    refreshKey,
    save,
    discard: () => {
      setContent(saved.content);
      setSections(saved.sections);
    },
  };
}
