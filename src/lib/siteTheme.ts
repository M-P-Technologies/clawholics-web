// The public site's look, chosen in Admin > Homepage: a colour set, and the display, script and
// body fonts. Each is a swap of the CSS variables the site is built on (globals.css), so every
// page follows. Saved with the homepage content as home_theme_palette, home_theme_display,
// home_theme_script and home_theme_body; never saved means the brand book's own colours and fonts.

export interface Palette {
  key: string;
  label: string;
  /** The five brand colours (accent, soft accent, page background, sand, text), and the two
   *  readable ones made from them (globals.css): the accent as text (at least 4.5:1 on the
   *  background, sand and the soft accent), and the text on an accent fill (at least 4.5:1 on
   *  the accent) */
  colors: { crimson: string; crimsonLight: string; lightOrange: string; sand: string; grayRed: string; crimsonInk: string; onCrimson: string };
}

export const PALETTES: Palette[] = [
  { key: "clawholics", label: "Clawholics pink", colors: { crimson: "#ff88a1", crimsonLight: "#f3b6c4", lightOrange: "#f6e9e1", sand: "#e8d7cd", grayRed: "#7a5f5a", crimsonInk: "#78404c", onCrimson: "#3d2b28" } },
  { key: "rose-gold", label: "Rose gold", colors: { crimson: "#d4917a", crimsonLight: "#ecc5b6", lightOrange: "#faf1ec", sand: "#ead8cd", grayRed: "#6b4f45", crimsonInk: "#704d41", onCrimson: "#44332c" } },
  { key: "lavender", label: "Lavender", colors: { crimson: "#b38bd6", crimsonLight: "#d9c6ec", lightOrange: "#f6f1fa", sand: "#e6dcef", grayRed: "#5e4b6e", crimsonInk: "#624c76", onCrimson: "#392e43" } },
  { key: "peach", label: "Peach", colors: { crimson: "#ff9a76", crimsonLight: "#ffc9b3", lightOrange: "#fff3ec", sand: "#f3dccf", grayRed: "#7a5348", crimsonInk: "#7f4d3b", onCrimson: "#5c3e36" } },
  { key: "sage", label: "Sage", colors: { crimson: "#8fb59a", crimsonLight: "#c5dccb", lightOrange: "#f3f6f0", sand: "#dfe7da", grayRed: "#4f5f52", crimsonInk: "#4c6052", onCrimson: "#374239" } },
  { key: "berry-noir", label: "Berry noir", colors: { crimson: "#c2185b", crimsonLight: "#f1a7c1", lightOrange: "#fbf3f5", sand: "#ecd6dd", grayRed: "#5a3a44", crimsonInk: "#921244", onCrimson: "#fbf3f5" } },
];

export interface FontChoice {
  key: string;
  label: string;
  /** Its CSS font-family: the brand fonts are next/font variables (app/layout.tsx); the others
   *  are loaded from Google Fonts in the browser, only when needed (see googleFontsHref) */
  css: string;
  /** The Google Fonts request for a font that isn't built in, e.g. "Lato:wght@400;700" */
  google?: string;
}

/** Headings (Tailwind font-display) */
export const DISPLAY_FONTS: FontChoice[] = [
  { key: "gloock", label: "Gloock", css: "var(--font-gloock)" },
  { key: "playfair", label: "Playfair Display", css: '"Playfair Display", serif', google: "Playfair+Display:wght@400;700" },
  { key: "dm-serif", label: "DM Serif Display", css: '"DM Serif Display", serif', google: "DM+Serif+Display" },
  { key: "cormorant", label: "Cormorant Garamond", css: '"Cormorant Garamond", serif', google: "Cormorant+Garamond:wght@500;700" },
  { key: "abril", label: "Abril Fatface", css: '"Abril Fatface", serif', google: "Abril+Fatface" },
];

/** The flowing accent lettering (font-script) */
export const SCRIPT_FONTS: FontChoice[] = [
  { key: "luxurious", label: "Luxurious Script", css: "var(--font-luxurious-script)" },
  { key: "great-vibes", label: "Great Vibes", css: '"Great Vibes", cursive', google: "Great+Vibes" },
  { key: "parisienne", label: "Parisienne", css: "Parisienne, cursive", google: "Parisienne" },
  { key: "alex-brush", label: "Alex Brush", css: '"Alex Brush", cursive', google: "Alex+Brush" },
  { key: "dancing", label: "Dancing Script", css: '"Dancing Script", cursive', google: "Dancing+Script:wght@400;700" },
];

/** Body text and buttons (font-sans) */
export const BODY_FONTS: FontChoice[] = [
  { key: "noto", label: "Noto Sans", css: "var(--font-noto-sans)" },
  { key: "lato", label: "Lato", css: "Lato, sans-serif", google: "Lato:ital,wght@0,400;0,700;1,400" },
  { key: "inter", label: "Inter", css: "Inter, sans-serif", google: "Inter:wght@400;500;700" },
  { key: "nunito", label: "Nunito", css: "Nunito, sans-serif", google: "Nunito:wght@400;500;700" },
  { key: "poppins", label: "Poppins", css: "Poppins, sans-serif", google: "Poppins:wght@400;500;700" },
];

/** The Google Fonts stylesheet for these fonts (the built-in ones need none), or null */
export function googleFontsHref(fonts: FontChoice[]): string | null {
  const families = [...new Set(fonts.map((font) => font.google).filter((g): g is string => Boolean(g)))];
  return families.length ? `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap` : null;
}

const DEFAULT_THEME = { palette: "clawholics", display: "gloock", script: "luxurious", body: "noto" };
export type SiteTheme = typeof DEFAULT_THEME;

const choose = (list: FontChoice[], key: unknown) => list.find((f) => f.key === key) ?? list[0];
const paletteOf = (key: string) => PALETTES.find((p) => p.key === key) ?? PALETTES[0];

/** The fonts a theme uses (to load the ones that aren't built in) */
export const themeFonts = (theme: SiteTheme): FontChoice[] => [choose(DISPLAY_FONTS, theme.display), choose(SCRIPT_FONTS, theme.script), choose(BODY_FONTS, theme.body)];

/** The chosen theme from the homepage content, or the brand's own */
export function readSiteTheme(content: object | null | undefined): SiteTheme {
  const values = (content ?? {}) as Record<string, unknown>;
  return {
    palette: paletteOf(String(values.home_theme_palette ?? DEFAULT_THEME.palette)).key,
    display: choose(DISPLAY_FONTS, values.home_theme_display).key,
    script: choose(SCRIPT_FONTS, values.home_theme_script).key,
    body: choose(BODY_FONTS, values.home_theme_body).key,
  };
}

/**
 * The CSS variables to set for a theme: the brand colours, and the brand's three font variables
 * pointed at the chosen fonts (globals.css maps font-display, font-script and font-sans to
 * --font-gloock, --font-luxurious-script and --font-noto-sans, so setting those to the chosen
 * fonts swaps every
 * heading, accent and body text). Nothing for the brand's own choices.
 */
export function themeVariables(theme: SiteTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  if (theme.palette !== DEFAULT_THEME.palette) {
    const { colors } = paletteOf(theme.palette);
    vars["--color-crimson"] = colors.crimson;
    vars["--color-crimson-light"] = colors.crimsonLight;
    vars["--color-light-orange"] = colors.lightOrange;
    vars["--color-sand"] = colors.sand;
    vars["--color-gray-red"] = colors.grayRed;
    vars["--color-crimson-ink"] = colors.crimsonInk;
    vars["--color-on-crimson"] = colors.onCrimson;
  }
  const roles: [FontChoice[], keyof SiteTheme, string][] = [
    [DISPLAY_FONTS, "display", "--font-gloock"],
    [SCRIPT_FONTS, "script", "--font-luxurious-script"],
    [BODY_FONTS, "body", "--font-noto-sans"],
  ];
  for (const [list, role, brandVariable] of roles) {
    const chosen = choose(list, theme[role]);
    if (chosen.key !== list[0].key) vars[brandVariable] = chosen.css;
  }
  return vars;
}
