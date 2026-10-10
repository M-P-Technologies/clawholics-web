import DOMPurify from "dompurify";

// Cleans HTML that comes from the admin or from generated legal text before it is shown.
// DOMPurify needs a browser DOM, so on the server this returns an empty string; screens
// that render it on first paint wait for the client (see useIsClient).
export const sanitizeHtml = (html: string, options?: { allowStyle?: boolean }) =>
  typeof window === "undefined"
    ? ""
    : DOMPurify.sanitize(html, options?.allowStyle ? { ADD_TAGS: ["style"] } : undefined);
