import { Gloock, Luxurious_Script, Noto_Sans } from "next/font/google";

// Brand fonts. Loaded with next/font instead of a CSS @import, which Turbopack drops from the
// output, leaving the browser on its serif/sans fallbacks. globals.css maps these variables to
// Tailwind's font-display, font-script and font-sans.
const display = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-gloock", display: "swap" });
const script = Luxurious_Script({ subsets: ["latin"], weight: "400", variable: "--font-luxurious-script", display: "swap" });
const sans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
  variable: "--font-noto-sans",
  display: "swap",
});

/** The three fonts' CSS variables, for the <html> element */
export const fontVariables = `${display.variable} ${script.variable} ${sans.variable}`;
