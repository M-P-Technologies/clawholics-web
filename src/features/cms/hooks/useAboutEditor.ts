"use client";

import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { normalizeCarousel } from "../components/CarouselEditor";
import { useToast } from "../../../components/ui/ToastProvider";
import { EMPTY_ABOUT_CONTENT, aboutWithDefaults } from "../lib/aboutEditor";
import { fetchAboutContent, updateAboutContent, uploadAboutImage, type AboutContent } from "../../content/api/aboutService";
import { fetchCarousel, updateCarousel, type CarouselItem } from "../../content/api/carouselService";
import { PHOTO_UPLOAD_OPTIONS, uploadImage } from "../../../lib/uploadService";
import { useEditorSource } from "./useEditorSource";

const loadAll = () => Promise.all([fetchAboutContent().then(aboutWithDefaults), fetchCarousel().then(normalizeCarousel)]);

// The About Us editor: the page's content and the studio gallery (the carousel), loaded, edited
// and saved together
export function useAboutEditor() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [content, setContent] = useState<AboutContent>(EMPTY_ABOUT_CONTENT);
  const [saved, setSaved] = useState<AboutContent>(EMPTY_ABOUT_CONTENT);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // The studio gallery's photos (the carousel), saved with the rest
  const [gallery, setGallery] = useState<CarouselItem[]>([]);
  const [savedGallery, setSavedGallery] = useState<CarouselItem[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const show = ([data, photos]: [AboutContent, CarouselItem[]]) => {
    setContent(data);
    setSaved(data);
    setGallery(photos);
    setSavedGallery(photos);
  };

  const dirty = JSON.stringify(content) !== JSON.stringify(saved) || JSON.stringify(gallery) !== JSON.stringify(savedGallery);
  // The saved content and gallery, cached: coming back to the editor shows them at once
  const source = useEditorSource({ name: "about", load: loadAll, dirty, onLoad: show });

  const set = (key: keyof AboutContent) => (value: string) => setContent((prev) => ({ ...prev, [key]: value }));

  const uploadGalleryPhoto = async (file: File) => {
    try {
      setGalleryUploading(true);
      const data = await uploadImage(file, "carousel", null, null, PHOTO_UPLOAD_OPTIONS);
      if (!data?.imageUrl) throw new Error("No image URL returned.");
      return data.imageUrl;
    } catch (error) {
      console.error("Failed to upload gallery photo:", error);
      toast.show("error", "Photo not uploaded", "We couldn't upload that photo to the gallery. Please check that it is an image file and try again.");
      return null;
    } finally {
      setGalleryUploading(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    try {
      setIsUploading(true);
      const data = await uploadAboutImage(file, await getToken(), currentUser?.id);
      set("about_image")(data.imageUrl);
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.show("error", "Photo not uploaded", "We couldn't upload that photo. Please check that it is an image file and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const save = async () => {
    const trimmed = Object.fromEntries(Object.entries(content).map(([key, value]) => [key, (value ?? "").trim()])) as AboutContent;
    if (Object.values(trimmed).some((value) => !value)) {
      toast.show("error", "Some fields are empty", "Please fill in every field before saving. Nothing was saved.");
      return;
    }
    if (gallery.length === 0) {
      toast.show("error", "Add at least one photo", "The studio gallery needs at least one photo before it can be saved.");
      return;
    }

    try {
      setIsSaving(true);
      const token = await getToken();
      await updateAboutContent(trimmed, token, currentUser?.id);
      await updateCarousel(normalizeCarousel(gallery), token, currentUser?.id);
      const fresh = await loadAll();
      show(fresh);
      source.saved(fresh);
      setRefreshKey((n) => n + 1);
      toast.show("success", "About us saved", "Your changes are now live on the website.");
    } catch (error) {
      console.error("Failed to save about content:", error);
      toast.show("error", "Changes not saved", "We couldn't save your changes, so the website still shows the previous version. Your edits are still on screen. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isLoading: source.isLoading,
    loadFailed: source.failed,
    retry: source.retry,
    content,
    set,
    gallery,
    setGallery,
    dirty,
    isSaving,
    isUploading,
    galleryUploading,
    refreshKey,
    uploadPhoto,
    uploadGalleryPhoto,
    save,
    discard: () => {
      setContent(saved);
      setGallery(savedGallery);
    },
  };
}
