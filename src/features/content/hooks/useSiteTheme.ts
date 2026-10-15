import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicQueries } from "@/lib/tanstack-query/publicQueries";
import { googleFontsHref, readSiteTheme, themeFonts, themeVariables } from "../lib/siteTheme";
import { useGoogleFonts } from "./useGoogleFonts";

// Applies the colour set and fonts chosen in Admin > Homepage to the public site. The variables
// go on <html>, so pop-ups and the page background follow too, and come off again when the site
// layout goes (the admin keeps the brand's own look). Until the content loads, the brand's look.
export function useSiteTheme() {
  // In the admin editor's preview, this follows the unsaved choice (see QueryProvider)
  const content = useQuery(publicQueries.home()).data;
  const theme = useMemo(() => readSiteTheme(content), [content]);

  // Fetch only the chosen fonts that aren't built in
  useGoogleFonts(googleFontsHref(themeFonts(theme)));

  useEffect(() => {
    const root = document.documentElement;
    const vars = themeVariables(theme);
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    return () => {
      for (const name of Object.keys(vars)) root.style.removeProperty(name);
    };
  }, [theme]);
}
