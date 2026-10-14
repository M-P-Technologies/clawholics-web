"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "@/components/molecules";
import { contactProblem, pickContactValues } from "../../lib/admin/contactEditor";
import { readSocialLinks, socialLinksToContent, type SocialLink } from "../../lib/socialLinks";
import { fetchHomeContent, updateHomeContent } from "../../services/contentService";

// The Contact Us editor: the Contact page's words, the phone and email, and the social links,
// loaded, edited and saved together
export function useContactEditor() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [values, setValues] = useState<Record<string, string>>(() => pickContactValues({}));
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [saved, setSaved] = useState<{ values: Record<string, string>; links: SocialLink[] }>(() => ({ values: pickContactValues({}), links: [] }));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchHomeContent();
        const loaded = { values: pickContactValues(data), links: readSocialLinks(data) };
        setValues(loaded.values);
        setLinks(loaded.links);
        setSaved(loaded);
        setError("");
      } catch (err) {
        console.warn("Couldn't load the contact details:", err);
        setError("We couldn't load the contact details.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [attempt]);

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
    isLoading,
    error,
    retry: () => {
      setIsLoading(true);
      setAttempt((n) => n + 1);
    },
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
    dirty: JSON.stringify({ values, links }) !== JSON.stringify(saved),
    isSaving,
    refreshKey,
    save,
    discard: () => {
      setValues(saved.values);
      setLinks(saved.links);
    },
  };
}
