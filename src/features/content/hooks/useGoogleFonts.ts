import { useEffect } from "react";

// Adds a Google Fonts stylesheet to the page (once per address), for the theme fonts that aren't
// built into the site. It stays after unmount: the browser keeps the fonts cached anyway.
export function useGoogleFonts(href: string | null) {
  useEffect(() => {
    if (!href || document.querySelector(`link[data-theme-fonts="${CSS.escape(href)}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.themeFonts = href;
    document.head.appendChild(link);
  }, [href]);
}
