import { describe, expect, it } from "vitest";
import { BODY_FONTS, DISPLAY_FONTS, PALETTES, SCRIPT_FONTS, googleFontsHref, readSiteTheme, themeFonts, themeVariables } from "@/features/content/lib/siteTheme";

describe("site theme", () => {
  it("offers six colour sets and five fonts for each of display, script and body", () => {
    expect(PALETTES).toHaveLength(6);
    expect([DISPLAY_FONTS, SCRIPT_FONTS, BODY_FONTS].map((list) => list.length)).toEqual([5, 5, 5]);
  });

  it("is the brand's own look until something else is chosen, and changes nothing then", () => {
    const theme = readSiteTheme({});
    expect(theme).toEqual({ palette: "clawholics", display: "gloock", script: "luxurious", body: "noto" });
    expect(themeVariables(theme)).toEqual({});
  });

  it("swaps the colour and font variables for the choices", () => {
    const theme = readSiteTheme({ home_theme_palette: "sage", home_theme_display: "playfair", home_theme_script: "parisienne", home_theme_body: "inter" });
    expect(themeVariables(theme)).toEqual({
      "--color-crimson": "#8fb59a",
      "--color-crimson-light": "#c5dccb",
      "--color-light-orange": "#f3f6f0",
      "--color-sand": "#dfe7da",
      "--color-gray-red": "#4f5f52",
      "--font-gloock": '"Playfair Display", serif',
      "--font-luxurious-script": "Parisienne, cursive",
      "--font-noto-sans": "Inter, sans-serif",
    });
  });

  it("only swaps what was changed, and ignores unknown choices", () => {
    expect(themeVariables(readSiteTheme({ home_theme_body: "poppins" }))).toEqual({ "--font-noto-sans": "Poppins, sans-serif" });
    expect(readSiteTheme({ home_theme_palette: "neon", home_theme_display: "comic-sans" })).toMatchObject({ palette: "clawholics", display: "gloock" });
  });

  it("fetches from Google Fonts only the chosen fonts that aren't built in", () => {
    expect(googleFontsHref(themeFonts(readSiteTheme({})))).toBeNull();
    expect(googleFontsHref(themeFonts(readSiteTheme({ home_theme_display: "playfair", home_theme_body: "inter" })))).toBe(
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;700&display=swap",
    );
  });
});
