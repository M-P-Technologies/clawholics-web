"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "@/components/molecules";
import { SEO_IMAGE_KEY } from "../../lib/seo";
import { seoFormFrom, seoProblem } from "../../lib/admin/seoEditor";
import { fetchSeoContent, updateSeoContent } from "../../services/seoService";
import { PHOTO_UPLOAD_OPTIONS, uploadImage } from "../../services/uploadService";
import { useEditorSource } from "./useEditorSource";

// Admin > Search & Sharing: each public page's search title and description, and the link preview
// picture, loaded, edited and saved together
export function useSeoEditor() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [form, setForm] = useState<Record<string, string>>(() => seoFormFrom({}));
  const [saved, setSaved] = useState<Record<string, string>>(() => seoFormFrom({}));
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const source = useEditorSource({
    name: "seo",
    load: async () => seoFormFrom(await fetchSeoContent()),
    dirty,
    onLoad: (loaded) => {
      setForm(loaded);
      setSaved(loaded);
    },
  });
  useEffect(() => {
    if (source.error) console.warn("Couldn't load the search and sharing text:", source.error);
  }, [source.error]);

  const save = async () => {
    const trimmed = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
    const wrong = seoProblem(trimmed);
    if (wrong) {
      toast.show("error", "Please check the form", `${wrong} Nothing was saved.`);
      return;
    }
    try {
      setIsSaving(true);
      await updateSeoContent(trimmed, await getToken(), currentUser?.id);
      setForm(trimmed);
      setSaved(trimmed);
      source.saved(trimmed);
      toast.show("success", "Search and sharing saved", "Search engines and link previews pick up the new text when they next visit.");
    } catch (error) {
      console.error("Failed to save the search and sharing text:", error);
      toast.show("error", "Changes not saved", error instanceof Error ? error.message : "We couldn't save your changes. Your edits are still on screen. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImagePhoto = async (file: File) => {
    setIsUploading(true);
    try {
      const data = await uploadImage(file, "content", null, null, PHOTO_UPLOAD_OPTIONS);
      if (!data?.imageUrl) throw new Error("No image URL returned.");
      setForm((prev) => ({ ...prev, [SEO_IMAGE_KEY]: data.imageUrl }));
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.show("error", "Photo not uploaded", "We couldn't upload that photo. Please check that it is an image file and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isLoading: source.isLoading,
    loadFailed: source.failed,
    retry: source.retry,
    form,
    set: (key: string) => (value: string) => setForm((prev) => ({ ...prev, [key]: value })),
    image: form[SEO_IMAGE_KEY],
    uploadImage: uploadImagePhoto,
    removeImage: () => setForm((prev) => ({ ...prev, [SEO_IMAGE_KEY]: "" })),
    dirty,
    isSaving,
    isUploading,
    save,
    discard: () => setForm(saved),
  };
}
