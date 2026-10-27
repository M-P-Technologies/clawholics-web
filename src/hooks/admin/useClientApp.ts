"use client";

import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "@/components/molecules";
import { clientAppProblem, clientAppToContent, readClientApp, type ClientAppContent, type ClientAppTextKey, type HomeOffer } from "../../lib/homeSections";
import { fetchHomeContent, updateHomeContent } from "../../services/contentService";
import { fetchServices, type NailService } from "../../services/serviceService";
import { PHOTO_UPLOAD_OPTIONS, uploadImage } from "../../services/uploadService";
import { useEditorSource } from "./useEditorSource";

const EMPTY: ClientAppContent = readClientApp(null);

const trimmed = (client: ClientAppContent): ClientAppContent => ({
  text: Object.fromEntries(Object.entries(client.text).map(([key, value]) => [key, value.trim()])) as ClientAppContent["text"],
  offers: client.offers.map((o) => ({ ...o, title: o.title.trim(), line: o.line.trim(), note: o.note.trim(), buttonLabel: o.buttonLabel.trim() })),
});

// What signed-in clients see in their app (/my), edited in Settings: the birthday banner's words and
// the Special offers. They are home content keys, but saved on their own (only these five keys are
// sent), and the Homepage editor doesn't send them, so neither can put back an older copy.
export function useClientApp() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [form, setForm] = useState<ClientAppContent>(EMPTY);
  const [saved, setSaved] = useState<ClientAppContent>(EMPTY);
  // The services an offer's button can open
  const [services, setServices] = useState<NailService[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const apply = (contentData: Record<string, string>) => {
    const next = readClientApp(contentData);
    setForm(next);
    setSaved(next);
  };

  const source = useEditorSource({
    name: "clientApp",
    load: async () => {
      const [contentData, serviceData] = await Promise.all([fetchHomeContent(), fetchServices().catch(() => [])]);
      return { contentData, serviceData };
    },
    dirty,
    onLoad: ({ contentData, serviceData }) => {
      apply(contentData);
      setServices(serviceData);
    },
  });

  /** Uploads an offer's photo, marking its slot busy meanwhile; null (with a message) when it fails */
  const upload = async (slot: string, file: File) => {
    setUploading((prev) => ({ ...prev, [slot]: true }));
    try {
      const data = await uploadImage(file, "content", null, null, PHOTO_UPLOAD_OPTIONS);
      if (!data?.imageUrl) throw new Error("No image URL returned.");
      return data.imageUrl;
    } catch (error) {
      console.error("Failed to upload an offer photo:", error);
      toast.show("error", "Photo not uploaded", "We couldn't upload that photo for the offer. Please check that it is an image file and try again.");
      return null;
    } finally {
      setUploading((prev) => ({ ...prev, [slot]: false }));
    }
  };

  /** What stops the block being saved, or null */
  const problem = () => clientAppProblem(trimmed(form));

  /** Saves the block; true when it was saved */
  const save = async (): Promise<boolean> => {
    const stopped = problem();
    if (stopped) {
      toast.show("error", "Client app not saved", `${stopped} Nothing was saved.`);
      return false;
    }
    try {
      setIsSaving(true);
      await updateHomeContent(clientAppToContent(trimmed(form)), await getToken(), user?.id);
      const contentData = await fetchHomeContent();
      apply(contentData);
      source.saved({ contentData, serviceData: services });
      toast.show("success", "Client app saved", "Clients see the new birthday banner and offers in their app.");
      return true;
    } catch (error) {
      console.error("Failed to save the client app content:", error);
      toast.show("error", "Client app not saved", "We couldn't save the birthday banner and offers, so clients still see the previous ones. Your edits are still on screen. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isLoading: source.isLoading,
    loadFailed: source.failed,
    retry: source.retry,
    text: form.text,
    offers: form.offers,
    services,
    setText: (key: ClientAppTextKey) => (value: string) => setForm((prev) => ({ ...prev, text: { ...prev.text, [key]: value } })),
    setOffers: (offers: HomeOffer[]) => setForm((prev) => ({ ...prev, offers })),
    uploading,
    upload,
    busy: Object.values(uploading).some(Boolean),
    dirty,
    isSaving,
    problem,
    save,
    discard: () => setForm(saved),
  };
}
