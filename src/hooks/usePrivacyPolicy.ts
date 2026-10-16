"use client";

import { useQuery } from "@tanstack/react-query";
import { PRIVACY_POLICY_HTML } from "../data/privacyPolicyHtml";
import { publicQueries } from "../lib/publicQueries";
import { sanitizeHtml } from "../utils/sanitizeHtml";
import { useIsClient } from "./useIsClient";

// The privacy policy as edited in Admin > Privacy Policy, sanitized; the original (generated)
// text until it's been saved there, or if it can't load. Null while it loads.
export function usePrivacyPolicy() {
  const { data: content, isPending } = useQuery(publicQueries.legal());
  const isClient = useIsClient();
  const saved = content?.legal_privacy_html;
  const html = isPending ? null : saved?.trim() ? saved : PRIVACY_POLICY_HTML;

  // Null on the server and through hydration, so DOMPurify only runs in the browser and the first
  // client render matches the server's HTML even if the content is ever prefilled there
  return html === null || !isClient ? null : sanitizeHtml(html, { allowStyle: true });
}
