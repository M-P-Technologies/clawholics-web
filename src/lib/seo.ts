import type { Metadata } from "next";

// What search engines and link previews read about each public page: its title (shown as
// "<title> | Clawholics by Max" through the root layout's template), its description, and its
// canonical address (one address per page, so /services/2 and /services/biab-overlay count as one).
// Each page's segment has a small layout.tsx that exports pageMetadata(<its key>).

export const SITE_NAME = "Clawholics by Max";

/** The site's own address, for canonical links, the sitemap and link previews */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://clawholicsbymax.com").replace(/\/+$/, "");

/** Descriptions stay under about 155 characters, which is what search results show */
export const SITE_DESCRIPTION =
  "Nail art studio in Cagayan de Oro: softgel extensions, BIAB, gel manicures and pedicures, lashes and custom nail art. Meet our artists and book online.";

/** The link preview image (public/og_image.png cropped to 1200x630) */
export const OG_IMAGE = { url: "/og-image.jpg", width: 1200, height: 630, alt: "Clawholics by Max, nail art studio, est. 2023" };

export const PAGES = {
  home: {
    path: "/",
    title: "Clawholics by Max | Nail Art Studio in Cagayan de Oro",
    description: SITE_DESCRIPTION,
  },
  services: {
    path: "/services",
    title: "Nail Services & Prices",
    description:
      "Softgel extensions, hard gel, BIAB, gel manicures, pedicures and lashes at Clawholics by Max in Cagayan de Oro. See prices and book online.",
  },
  artists: {
    path: "/artists",
    title: "Our Nail Artists",
    description: "Meet the master and junior nail technicians at Clawholics by Max, see their work, and book with the artist you like.",
  },
  about: {
    path: "/about",
    title: "About Us",
    description: "The story of Clawholics by Max, a nail art studio in Cagayan de Oro founded in 2023: our studio, opening hours and where to find us.",
  },
  contact: {
    path: "/contact",
    title: "Contact Us",
    description: "Call, message or visit Clawholics by Max in Cagayan de Oro, or send us a message through the form. We're happy to help.",
  },
  faq: {
    path: "/faq",
    title: "Frequently Asked Questions",
    description: "Answers about booking, the downpayment, rescheduling, our services and aftercare at Clawholics by Max.",
  },
  privacy: {
    path: "/privacy",
    title: "Privacy Policy",
    description: "How Clawholics by Max collects, uses and protects your personal information.",
  },
  terms: {
    path: "/terms",
    title: "Terms & Conditions",
    description: "The booking, downpayment, cancellation and rescheduling terms at Clawholics by Max.",
  },
  tou: {
    path: "/tou",
    title: "Terms of Use",
    description: "The terms for using the Clawholics by Max website and online booking.",
  },
  login: { path: "/login", title: "Log In", description: "Log in to book and manage your Clawholics by Max appointments." },
  signup: { path: "/signup", title: "Sign Up", description: "Create a Clawholics by Max account to book appointments and collect loyalty stamps." },
  onboarding: { path: "/onboarding", title: "Your Details", description: "Finish setting up your Clawholics by Max account." },
} satisfies Record<string, { path: string; title: string; description: string }>;

export type PageKey = keyof typeof PAGES;

/** Account pages: kept out of search results, but their links are still followed */
const NOT_INDEXED: PageKey[] = ["login", "signup", "onboarding"];

/** The metadata for a page: a full address, title, description and link preview */
export function pageMetadata(key: PageKey): Metadata {
  const page = PAGES[key];
  return seoMetadata({
    path: page.path,
    // The home page's title already names the studio, so it skips the "| Clawholics by Max" template
    title: key === "home" ? { absolute: page.title } : page.title,
    description: page.description,
    index: !NOT_INDEXED.includes(key),
  });
}

interface SeoInput {
  path: string;
  title: string | { absolute: string };
  description: string;
  /** A page-specific preview image (a service's or artist's photo); the studio banner otherwise */
  image?: string | null;
  index?: boolean;
}

/** The metadata for any public page, including the service and artist pages */
export function seoMetadata({ path, title, description, image, index = true }: SeoInput): Metadata {
  const shownTitle = typeof title === "string" ? `${title} | ${SITE_NAME}` : title.absolute;
  const images = image ? [{ url: image, alt: shownTitle }] : [OG_IMAGE];
  return {
    // Written out in full: the root layout's "%s | Clawholics by Max" template doesn't reach a
    // page whose parent layout also sets a title (a service's page under /services)
    title: { absolute: shownTitle },
    description,
    alternates: { canonical: path },
    robots: index ? undefined : { index: false, follow: true },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_PH", url: path, title: shownTitle, description, images },
    twitter: { card: "summary_large_image", title: shownTitle, description, images },
  };
}

/** A service or artist address that matches nothing: kept out of search results, with no
 *  canonical or description inherited from the list page above it */
export const NOT_FOUND_METADATA = (what: string): Metadata => ({
  title: { absolute: `${what} not found | ${SITE_NAME}` },
  description: null,
  alternates: { canonical: null },
  robots: { index: false, follow: true },
});

/** A description cut to what search results show (about 155 characters), at a word */
export function shortDescription(text: string | null | undefined, fallback: string): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  if (clean.length <= 155) return clean;
  return `${clean.slice(0, 152).replace(/\s+\S*$/, "")}…`;
}
