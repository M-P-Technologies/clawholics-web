"use client";

import { useEffect, useState } from "react";
import { PRIVACY_POLICY_HTML } from "../data/privacyPolicyHtml";
import { usePreviewVersion } from "../lib/cmsPreview";
import { fetchLegalContent } from "../services/contentService";
import { sanitizeHtml } from "../utils/sanitizeHtml";

// The privacy policy as edited in Admin > Privacy Policy, sanitized; the original (generated)
// text until it's been saved there, or if it can't load. Null while it loads.
export function usePrivacyPolicy() {
  const [html, setHtml] = useState<string | null>(null);
  // In the admin editor's preview, fetch again when the unsaved changes do
  const previewVersion = usePreviewVersion();

  useEffect(() => {
    let live = true;
    fetchLegalContent().then(
      (content) => live && setHtml(content.legal_privacy_html?.trim() ? content.legal_privacy_html : PRIVACY_POLICY_HTML),
      () => live && setHtml(PRIVACY_POLICY_HTML),
    );
    return () => {
      live = false;
    };
  }, [previewVersion]);

  // Only set in the browser (after the fetch), so DOMPurify never runs on the server
  return html === null ? null : sanitizeHtml(html, { allowStyle: true });
}
