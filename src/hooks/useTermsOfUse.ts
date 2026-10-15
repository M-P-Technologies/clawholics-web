"use client";

import { TERMS_OF_USE_HTML } from "../data/termsOfUseHtml";
import { sanitizeHtml } from "../utils/sanitizeHtml";
import { useIsClient } from "./useIsClient";

// The terms of use, sanitized; empty on the server, where DOMPurify can't run
export function useTermsOfUse() {
  const isClient = useIsClient();
  return isClient ? sanitizeHtml(TERMS_OF_USE_HTML, { allowStyle: true }) : "";
}
