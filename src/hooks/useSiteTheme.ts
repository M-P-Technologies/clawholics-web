import { useEffect, useState } from "react";
import { usePreviewVersion } from "@/lib/cmsPreview";
import { googleFontsHref, readSiteTheme, themeFonts, themeVariables } from "../lib/siteTheme";
import { useGoogleFonts } from "./useGoogleFonts";
import { fetchHomeContent } from "../services/contentService";
import { lastSeen } from "../utils/lastSeen";

// Applies the colour set and fonts chosen in Admin > Homepage to the public site. The variables
// go on <html>, so pop-ups and the page background follow too, and come off again when the site
// layout goes (the admin keeps the brand's own look). Until the content loads, the brand's look.
export function useSiteTheme() {
  const [theme, setTheme] = useState(() => readSiteTheme(lastSeen("home")));
  // In the admin editor's preview, follow the unsaved choice
  const previewVersion = usePreviewVersion();

  useEffect(() => {
    let live = true;
    fetchHomeContent().then(
      (content) => live && setTheme(readSiteTheme(content)),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [previewVersion]);

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
