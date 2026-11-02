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

// The text search engines and link previews show can be edited in Admin > Search & Sharing. It is
// saved as content (the `seo` section): seo_<page>_title and seo_<page>_description for the pages
// below, and seo_image for the link preview picture. A key that was never saved (or is empty)
// keeps what is written in PAGES above.

/** The pages whose title and description are editable (the account pages stay as written) */
export const SEO_PAGE_KEYS = ["home", "services", "artists", "about", "contact", "faq", "terms", "privacy", "tou"] as const satisfies readonly PageKey[];
export type SeoPageKey = (typeof SEO_PAGE_KEYS)[number];

export const seoKey = (page: SeoPageKey, field: "title" | "description") => `seo_${page}_${field}`;
export const SEO_IMAGE_KEY = "seo_image";

/** The saved `seo` content: key to value */
export type SeoContent = Record<string, string | null | undefined>;

const seoText = (content: SeoContent | null | undefined, key: string, fallback: string) => {
  const value = content?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

/** A page's title and description as the site shows them: what was saved, else the default */
export function pageSeo(key: PageKey, content?: SeoContent | null): { title: string; description: string } {
  const page = PAGES[key];
  if (!(SEO_PAGE_KEYS as readonly string[]).includes(key)) return { title: page.title, description: page.description };
  return {
    title: seoText(content, seoKey(key as SeoPageKey, "title"), page.title),
    description: seoText(content, seoKey(key as SeoPageKey, "description"), page.description),
  };
}

/** The picture link previews show: the one uploaded in Admin > Search & Sharing, else the studio banner */
export function siteOgImage(content?: SeoContent | null): { url: string; width?: number; height?: number; alt: string } {
  const url = seoText(content, SEO_IMAGE_KEY, "");
  return url ? { url, alt: OG_IMAGE.alt } : OG_IMAGE;
}

/** Account pages: kept out of search results, but their links are still followed */
const NOT_INDEXED: PageKey[] = ["login", "signup", "onboarding"];

/** The metadata for a page: a full address, title, description and link preview */
export function pageMetadata(key: PageKey, content?: SeoContent | null): Metadata {
  const page = PAGES[key];
  const { title, description } = pageSeo(key, content);
  return seoMetadata({
    path: page.path,
    // The home page's title already names the studio, so it skips the "| Clawholics by Max" template
    title: key === "home" ? { absolute: title } : title,
    description,
    index: !NOT_INDEXED.includes(key),
    content,
  });
}

interface SeoInput {
  path: string;
  title: string | { absolute: string };
  description: string;
  /** A page-specific preview image (a service's or artist's photo); the studio banner otherwise */
  image?: string | null;
  index?: boolean;
  /** The saved search and sharing text, for the default link preview picture */
  content?: SeoContent | null;
}

/** The metadata for any public page, including the service and artist pages */
export function seoMetadata({ path, title, description, image, index = true, content }: SeoInput): Metadata {
  const shownTitle = typeof title === "string" ? `${title} | ${SITE_NAME}` : title.absolute;
  const images = image ? [{ url: image, alt: shownTitle }] : [siteOgImage(content)];
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
