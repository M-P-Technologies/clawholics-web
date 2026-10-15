"use client";

import { useEffect, useState } from "react";
import { useEditorSource } from "./useEditorSource";
import { useAuth, useUser } from "@clerk/nextjs";
import { useToast } from "@/components/molecules";
import { PRIVACY_POLICY_HTML } from "../../data/privacyPolicyHtml";
import { PRIVACY_KEY } from "../../lib/admin/cmsPages";
import { fetchLegalContent, updateLegalContent } from "../../services/contentService";
import { htmlHasText, sanitizeHtml } from "../../utils/sanitizeHtml";

// The privacy policy editor: the policy's HTML, loaded (the original, generated policy until one
// is saved), edited and saved after sanitizing
export function usePrivacyEditor() {
  const toast = useToast();
  const { getToken } = useAuth();
  const { user: currentUser } = useUser();
  const [html, setHtml] = useState("");
  const [saved, setSaved] = useState("");
  // True while the site still shows the original policy (nothing saved here yet)
  const [isOriginal, setIsOriginal] = useState(true);
  // Bumped to put new text into the editor (on load, and for "Put back the original")
  const [resetKey, setResetKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // The saved policy, cached: coming back to the editor shows it at once
  const source = useEditorSource({
    name: "privacy",
    load: fetchLegalContent,
    dirty: html !== saved,
    onLoad: (content: Record<string, string>) => {
      const current = content[PRIVACY_KEY]?.trim() ? content[PRIVACY_KEY] : PRIVACY_POLICY_HTML;
      setHtml(current);
      setSaved(current);
      setIsOriginal(!content[PRIVACY_KEY]?.trim());
      setResetKey((n) => n + 1);
    },
  });
  useEffect(() => {
    if (source.error) console.warn("Couldn't load the privacy policy:", source.error);
  }, [source.error]);

  const replaceWith = (next: string) => {
    setHtml(next);
    setResetKey((n) => n + 1);
  };

  const save = async () => {
    const clean = sanitizeHtml(html, { allowStyle: true });
    if (!htmlHasText(clean)) {
      toast.show("error", "The policy is empty", "Please write the privacy policy before saving. Nothing was saved.");
      return;
    }
    try {
      setIsSaving(true);
      await updateLegalContent({ [PRIVACY_KEY]: clean }, await getToken(), currentUser?.id);
      setHtml(clean);
      setSaved(clean);
      setIsOriginal(false);
      source.saved({ [PRIVACY_KEY]: clean });
      setRefreshKey((n) => n + 1);
      toast.show("success", "Privacy policy saved", "Your changes are now live on the privacy policy page.");
    } catch (error) {
      console.error("Failed to save the privacy policy:", error);
      toast.show("error", "Changes not saved", "We couldn't save the policy, so the website still shows the previous version. Your edits are still on screen. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isLoading: source.isLoading,
    loadFailed: source.failed,
    retry: source.retry,
    html,
    setHtml,
    resetKey,
    isOriginal,
    /** The editor no longer holds the original, generated policy */
    differsFromOriginal: html !== PRIVACY_POLICY_HTML,
    dirty: html !== saved,
    isSaving,
    refreshKey,
    save,
    discard: () => replaceWith(saved),
    restoreOriginal: () => replaceWith(PRIVACY_POLICY_HTML),
  };
}
