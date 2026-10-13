import {
  CalendarHeart,
  Eye,
  Flower2,
  Gem,
  Hand,
  Heart,
  Mail,
  Paintbrush,
  Palette,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { FACEBOOK_URL, GOOD_TO_KNOW, photoFocusY } from "../data/home";
import { startingPrice, type Priceable } from "../services/pricing";
import type { StripItem } from "../types/home";

// The home page's editable words and pieces: the hero line, the studio intro beside the emblem,
// the "Why choose us?" cards, the service photo strip, the About teaser, the FAQ heading and the
// closing banner. They're saved with the homepage content as home_* keys; a key that was never
// saved falls back to what the site has always shown, so nothing changes until an admin edits it.

/** The icons a card can use: the four the site started with, and more in the salon's spirit */
export const FEATURE_ICONS: { key: string; label: string; Icon: LucideIcon }[] = [
  { key: "sparkles", label: "Sparkles", Icon: Sparkles },
  { key: "users", label: "People", Icon: Users },
  { key: "heart", label: "Heart", Icon: Heart },
  { key: "mail", label: "Mail", Icon: Mail },
  { key: "hand", label: "Hand (manicure)", Icon: Hand },
  { key: "paintbrush", label: "Paintbrush (nail art)", Icon: Paintbrush },
  { key: "palette", label: "Palette (colours)", Icon: Palette },
  { key: "eye", label: "Eye (lashes)", Icon: Eye },
  { key: "gem", label: "Gem", Icon: Gem },
  { key: "flower", label: "Flower", Icon: Flower2 },
  { key: "calendar-heart", label: "Calendar (booking)", Icon: CalendarHeart },
  { key: "shield-check", label: "Shield (clean and safe)", Icon: ShieldCheck },
];

export const iconFor = (key: string): LucideIcon => FEATURE_ICONS.find((icon) => icon.key === key)?.Icon ?? Sparkles;

/** The pages a card or link can open */
const SITE_LINKS = [
  { path: "/services", label: "Services" },
  { path: "/artists", label: "Artists" },
  { path: "/about", label: "About" },
  { path: "/faq", label: "FAQ" },
  { path: "/contact", label: "Contact" },
];

/** The same pages, as the choices of a link field */
export const SITE_LINK_OPTIONS = SITE_LINKS.map((link) => ({ value: link.path, label: link.label }));

/** The plain words, by content key, with what the site showed before they were editable */
export const HOME_TEXT_DEFAULTS = {
  // The site's look (src/lib/siteTheme.ts): a colour set, and the display, script and body fonts
  home_theme_palette: "clawholics",
  home_theme_display: "gloock",
  home_theme_script: "luxurious",
  home_theme_body: "noto",
  home_hero_text: "From classic manicures to nail art, every service is designed to make you feel pampered and beautiful.",
  home_offer_eyebrow: "Clawholics by Max",
  home_offer_text:
    "Nail art studio offering manicures and pedicures, from gel sets to softgel and hardgel extensions, plus BIAB overlays and Russian manicure. We also do lashes, brow lamination and tints.",
  home_offer_link_label: "Browse all services",
  home_offer_link: "/services",
  home_features_title: "Why choose us?",
  home_about_eyebrow: "About us",
  home_about_heading: "Where every set is made with care",
  home_about_text:
    "Clawholics by Max was founded in 2023 with a simple dream. What began in a tiny corner of an eatery is now a nail studio built on dedication and heart.",
  home_about_link_label: "Read our story",
  home_reviews_title: "What our clients say",
  home_faq_title: "Frequently asked questions",
  home_cta_title: "Ready for your next set?",
  home_cta_text: "Pick a service and a time. We handle the rest.",
  home_cta_primary_label: "Book now",
  home_cta_primary_link: "/services",
  home_cta_secondary_label: "Contact us",
  home_cta_secondary_link: "/contact",
  home_footer_explore_title: "Explore",
  home_footer_help_title: "Help",
  home_footer_follow_title: "Follow",
  home_footer_chat_title: "Chat with us",
  home_footer_chat_label: "Chat on Facebook",
  home_footer_chat_url: "https://www.facebook.com/clawholicsbymax",
  home_footer_copyright: "Copyright © 2026 Clawholics by Max",
};

export type HomeTextKey = keyof typeof HOME_TEXT_DEFAULTS;

/** A full web address (opens in a new tab), rather than a page of the site */
const isExternalLink = (link: string) => /^https?:\/\/\S+$/i.test(link.trim());

/** What a button's link is wrong with, or null: it must be a page of the site or a web address */
export function linkProblem(link: string, what: string): string | null {
  if (SITE_LINKS.some((page) => page.path === link) || isExternalLink(link)) return null;
  return `${what} must open a page of the site or a full web address, starting with https://.`;
}

/** A banner button: a page of the site, or a web address in a new tab */
export const ctaLink = (link: string, label: string) => (isExternalLink(link) ? { href: link.trim(), label } : { to: link, label });

/** The Services page's heading and closing banner, saved apart from the Homepage's words (in Admin >
 *  Services). Its subtitle is the older home_services_subtitle key. */
export const SERVICES_PAGE_DEFAULTS = {
  home_services_title: "Nail services",
  home_services_cta_title: "Not sure what to get?",
  home_services_cta_text: "Talk to our support or ask one of our artists. They will help you pick the right set.",
  home_services_cta_primary_label: "Talk to support",
  home_services_cta_primary_link: FACEBOOK_URL,
  home_services_cta_secondary_label: "Meet our artists",
  home_services_cta_secondary_link: "/artists",
};

export type ServicesPageKey = keyof typeof SERVICES_PAGE_DEFAULTS;

export function readServicesPage(content: object | null | undefined): Record<ServicesPageKey, string> {
  const values = (content ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(SERVICES_PAGE_DEFAULTS).map(([key, fallback]) => {
      const value = values[key];
      return [key, typeof value === "string" && value.trim() ? value : fallback];
    }),
  ) as Record<ServicesPageKey, string>;
}

export function servicesPageProblem(text: Record<ServicesPageKey, string>): string | null {
  if (Object.values(text).some((value) => !value.trim())) return "The heading and every field of the banner need something in them.";
  return linkProblem(text.home_services_cta_primary_link, "The main button") ?? linkProblem(text.home_services_cta_secondary_link, "The second button");
}

/** The FAQ page's heading, intro and closing banner, saved apart from the Homepage's words (in
 *  Admin > FAQs) */
export const FAQ_PAGE_DEFAULTS = {
  home_faq_page_title: "Frequently asked questions",
  home_faq_page_intro: "Bookings, deposits, aftercare and more. Tap a question to see the answer.",
  home_faq_cta_title: "Still have a question?",
  home_faq_cta_text: "Send us a message and we'll get back to you.",
  home_faq_cta_primary_label: "Contact us",
  home_faq_cta_primary_link: "/contact",
  home_faq_cta_secondary_label: "See services",
  home_faq_cta_secondary_link: "/services",
};

export type FaqPageKey = keyof typeof FAQ_PAGE_DEFAULTS;

/** Saved words over their defaults: a key that was never saved (or is empty) shows the default */
function readWords<K extends string>(defaults: Record<K, string>, content: object | null | undefined): Record<K, string> {
  const values = (content ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    (Object.entries(defaults) as [K, string][]).map(([key, fallback]) => {
      const value = values[key];
      return [key, typeof value === "string" && value.trim() ? value : fallback];
    }),
  ) as Record<K, string>;
}

export const readFaqPage = (content: object | null | undefined) => readWords(FAQ_PAGE_DEFAULTS, content);

export function faqPageProblem(text: Record<FaqPageKey, string>): string | null {
  if (Object.values(text).some((value) => !value.trim())) return "The heading, intro and every field of the banner need something in them.";
  return linkProblem(text.home_faq_cta_primary_link, "The main button") ?? linkProblem(text.home_faq_cta_secondary_link, "The second button");
}

/** The Artists page's words (team_* content, edited in Admin > Artists) */
const TEAM_PAGE_DEFAULTS = {
  team_title: "Meet our artists",
  team_description: "Our team of reliable nail artists provide professional nail care and custom designs tailored to each client's preferences.",
  team_art_title: "Their art",
};

export type TeamPageKey = keyof typeof TEAM_PAGE_DEFAULTS;

export function readTeamPage(content: object | null | undefined): Record<TeamPageKey, string> {
  const values = (content ?? {}) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(TEAM_PAGE_DEFAULTS).map(([key, fallback]) => {
      const value = values[key];
      return [key, typeof value === "string" && value.trim() ? value : fallback];
    }),
  ) as Record<TeamPageKey, string>;
}

export interface HomeFeature {
  icon: string;
  title: string;
  text: string;
  link: string;
}

export const DEFAULT_FEATURES: HomeFeature[] = [
  { icon: "sparkles", title: "Nails and lashes", text: "Manicures, gel and softgel sets, eyelash extensions and brow lamination.", link: "/services" },
  { icon: "users", title: "Pick your artist", text: "Choose a master or junior technician and book the one whose work you love.", link: "/artists" },
  { icon: "heart", title: "Made with care", text: "Founded in 2023 on dedication, creativity and heart, in every set we do.", link: "/about" },
  { icon: "mail", title: "Easy to reach", text: "Message us, call, or find us on social media, and we will get back to you soon.", link: "/contact" },
];

/** One slide of the service photo strip: a service, with its own photo and title if set */
export interface StripSlide {
  serviceId: number;
  /** Empty uses the service's name */
  title: string;
  /** Empty uses the service's photo */
  image: string;
}

export const MAX_STRIP_SLIDES = 12;

export interface HomeSections {
  text: Record<HomeTextKey, string>;
  features: HomeFeature[];
  /** An uploaded photo in place of the emblem; empty shows the Clawholics emblem */
  offerImage: string;
  /** An uploaded logo for the footer; empty shows the Clawholics logo */
  footerLogo: string;
  /** The strip's slides; null shows every service that has a photo, as the site always did */
  strip: StripSlide[] | null;
}

const featureKey = (n: number, field: keyof HomeFeature) => `home_feature_${n}_${field}`;

function readStrip(raw: unknown): StripSlide[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const slides = parsed
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object" && Number.isInteger(s.serviceId))
      .map((s) => ({ serviceId: s.serviceId as number, title: typeof s.title === "string" ? s.title : "", image: typeof s.image === "string" ? s.image : "" }))
      .slice(0, MAX_STRIP_SLIDES);
    return slides.length ? slides : null;
  } catch {
    return null;
  }
}

/** The sections as the site shows them: what was saved, or the default for anything that wasn't */
export function readHomeSections(content: object | null | undefined): HomeSections {
  const values = (content ?? {}) as Record<string, unknown>;
  const read = (key: string, fallback: string) => {
    const value = values[key];
    return typeof value === "string" && value.trim() ? value : fallback;
  };
  return {
    text: Object.fromEntries(Object.entries(HOME_TEXT_DEFAULTS).map(([key, fallback]) => [key, read(key, fallback)])) as Record<HomeTextKey, string>,
    features: DEFAULT_FEATURES.map((feature, i) => ({
      icon: read(featureKey(i + 1, "icon"), feature.icon),
      title: read(featureKey(i + 1, "title"), feature.title),
      text: read(featureKey(i + 1, "text"), feature.text),
      link: read(featureKey(i + 1, "link"), feature.link),
    })),
    offerImage: read("home_offer_image", ""),
    footerLogo: read("home_footer_logo", ""),
    strip: readStrip(values.home_strip),
  };
}

/** The content keys to save the sections under */
export function homeSectionsToContent(sections: HomeSections): Record<string, string> {
  return {
    ...sections.text,
    ...Object.fromEntries(
      sections.features.flatMap((feature, i) =>
        (["icon", "title", "text", "link"] as const).map((field) => [featureKey(i + 1, field), feature[field]]),
      ),
    ),
    home_offer_image: sections.offerImage,
    home_footer_logo: sections.footerLogo,
    home_strip: sections.strip?.length ? JSON.stringify(sections.strip) : "",
  };
}

/** The first thing that stops the sections being saved, or null. Photos may be empty. */
export function homeSectionsProblem(sections: HomeSections): string | null {
  if (Object.values(sections.text).some((value) => !value.trim())) return "Every text field on the home page needs something in it.";
  if (!isExternalLink(sections.text.home_footer_chat_url)) return "The footer's chat link must be a full web address, starting with https://.";
  const cta = linkProblem(sections.text.home_cta_primary_link, "The closing banner's main button") ?? linkProblem(sections.text.home_cta_secondary_link, "The closing banner's second button");
  if (cta) return cta;
  for (const [i, feature] of sections.features.entries()) {
    if (!feature.title.trim() || !feature.text.trim()) return `Why choose us card ${i + 1} needs a title and a description.`;
  }
  return null;
}

/**
 * The home content with the salon's address and map link taken from About Us, where they're
 * edited (the Contact page, booking and Quick contact all show the same place). The older
 * contact_location keys are only a fallback, for when About Us has none or can't load.
 */
export function withSalonLocation<T extends Record<string, string>>(home: T, about: { about_location?: string; about_location_url?: string } | null | undefined): T {
  return {
    ...home,
    contact_location: about?.about_location?.trim() || home.contact_location || "",
    contact_location_url: about?.about_location_url?.trim() || home.contact_location_url || "",
  };
}

/** The Quick contact's Good to know items: the About content's lines, or the defaults */
export function readGoodToKnow(about: { about_good_to_know?: string } | null | undefined): string[] {
  const lines = (about?.about_good_to_know ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines : GOOD_TO_KNOW;
}

type StripService = Priceable & { id: number; name: string; image?: string | null; duration: string };

/** The strip's slides for the site: the chosen ones, or every service with a photo */
export function buildStripItems(services: StripService[], slides: StripSlide[] | null): StripItem[] {
  const item = (service: StripService, title = "", image = ""): StripItem | null => {
    const photo = image || service.image;
    if (!photo) return null;
    return {
      id: service.id,
      image: photo,
      name: title.trim() || service.name,
      price: startingPrice(service),
      duration: service.duration,
      // A chosen photo is cropped from its middle; the service photos have their own crop
      focusY: image ? 50 : photoFocusY(service.name),
    };
  };

  if (!slides) return services.map((service) => item(service)).filter((s): s is StripItem => s !== null);

  const seen = new Set<number>();
  return slides.flatMap((slide) => {
    const service = services.find((s) => s.id === slide.serviceId);
    if (!service || seen.has(service.id)) return [];
    seen.add(service.id);
    const built = item(service, slide.title, slide.image);
    return built ? [built] : [];
  });
}
