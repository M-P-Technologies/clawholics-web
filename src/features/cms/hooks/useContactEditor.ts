"use client";

import { useEffect, useState } from "react";
import { useEditorSource } from "./useEditorSource";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "../../../components/ui/ToastProvider";
import { contactProblem, pickContactValues } from "../lib/contactEditor";
import { readSocialLinks, socialLinksToContent, type SocialLink } from "../../content/lib/socialLinks";
import { fetchHomeContent, updateHomeContent } from "../../content/api/contentService";

// The Contact Us editor: the Contact page's words, the phone and email, and the social links,
// loaded, edited and saved together
export function useContactEditor() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [values, setValues] = useState<Record<string, string>>(() => pickContactValues({}));
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [saved, setSaved] = useState<{ values: Record<string, string>; links: SocialLink[] }>(() => ({ values: pickContactValues({}), links: [] }));
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const dirty = JSON.stringify({ values, links }) !== JSON.stringify(saved);
  // The saved details, cached: coming back to the editor shows them at once
  const source = useEditorSource({
    name: "contact",
    load: async () => {
      const data = await fetchHomeContent();
      return { values: pickContactValues(data), links: readSocialLinks(data) };
    },
    dirty,
    onLoad: (loaded) => {
      setValues(loaded.values);
      setLinks(loaded.links);
      setSaved(loaded);
    },
  });
  const error = source.failed ? "We couldn't load the contact details." : "";
  useEffect(() => {
    if (source.error) console.warn("Couldn't load the contact details:", source.error);
  }, [source.error]);

  const save = async () => {
    const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
    const trimmedLinks = links.map((link) => ({ ...link, name: link.name.trim(), url: link.url.trim() }));
    const wrong = contactProblem(trimmed, trimmedLinks);
    if (wrong) {
      toast.show("error", "Please check the form", `${wrong} Nothing was saved.`);
      return;
    }
    try {
      setIsSaving(true);
      await updateHomeContent({ ...trimmed, ...socialLinksToContent(trimmedLinks) }, await getToken(), currentUser?.id);
      setValues(trimmed);
      setLinks(trimmedLinks);
      setSaved({ values: trimmed, links: trimmedLinks });
      source.saved({ values: trimmed, links: trimmedLinks });
      setRefreshKey((n) => n + 1);
      toast.show("success", "Contact details saved", "Your changes are now live on the website.");
    } catch (err) {
      console.error("Failed to save:", err);
      toast.show("error", "Changes not saved", err instanceof Error ? err.message : "We couldn't save your changes, so the website still shows the previous contact details. Your edits are still on screen. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isLoading: source.isLoading,
    error,
    retry: source.retry,
    values,
    set: (key: string) => (value: string) => setValues((prev) => ({ ...prev, [key]: value })),
    links,
    setLink: (index: number, change: Partial<SocialLink>) => setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, ...change } : link))),
    moveLink: (index: number, by: number) =>
      setLinks((prev) => {
        const next = [...prev];
        [next[index], next[index + by]] = [next[index + by], next[index]];
        return next;
      }),
    removeLink: (index: number) => setLinks((prev) => prev.filter((_, i) => i !== index)),
    addLink: () => setLinks((prev) => [...prev, { platform: "website", name: "", url: "" }]),
    /** What the preview shows: the form as it stands, as home content */
    draft: { ...values, ...socialLinksToContent(links) },
    dirty,
    isSaving,
    refreshKey,
    save,
    discard: () => {
      setValues(saved.values);
      setLinks(saved.links);
    },
  };
}
