"use client";

import { useQuery } from "@tanstack/react-query";
import { PRIVACY_POLICY_HTML } from "../data/privacyPolicyHtml";
import { publicQueries } from "../lib/publicQueries";
import { sanitizeHtml } from "../utils/sanitizeHtml";

// The privacy policy as edited in Admin > Privacy Policy, sanitized; the original (generated)
// text until it's been saved there, or if it can't load. Null while it loads.
export function usePrivacyPolicy() {
  const { data: content, isPending } = useQuery(publicQueries.legal());
  const saved = content?.legal_privacy_html;
  const html = isPending ? null : saved?.trim() ? saved : PRIVACY_POLICY_HTML;

  // Null on the server (the query hasn't run), so DOMPurify only runs in the browser
  return html === null ? null : sanitizeHtml(html, { allowStyle: true });
}
