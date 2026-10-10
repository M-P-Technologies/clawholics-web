// Reads a colour from the theme defined in index.css, for APIs that need a
// literal colour string (for example the QR code). Returns undefined when the
// stylesheet is not loaded (tests), so the library default applies.
export function themeColor(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--color-${name}`)
    .trim();
  return value || undefined;
}
