import "server-only";
import type { Metadata } from "next";
import { publicPosition } from "../lib/artistRoles";
import { readSocialLinks } from "@/lib/socialLinkData";
import { NOT_FOUND_METADATA, PAGES, SITE_NAME, SITE_URL, pageMetadata, pageSeo, seoMetadata, shortDescription, siteOgImage, type PageKey, type SeoContent } from "@/lib/seo";
import { servicePath, artistPath, findBySlugOrId } from "@/utils/slug";
import type { NailService } from "@/services/serviceService";
import type { Nailist } from "@/services/nailistService";
import { splitSpecialties } from "@/lib/specialties";
import { publicReads } from "./publicCache";
import { readOrNull } from "./timeLimit";

// Schema.org markup (JSON-LD) for search engines, built from the content the admin edits: the
// salon as a NailSalon (address, phone, hours, social profiles), each service, each artist, and
// the FAQs. Rendered by components/seo/JsonLd from the pages' server layouts. A read that fails
// leaves the markup out; the page itself doesn't depend on it.

type Json = Record<string, unknown>;
type Row = Record<string, unknown>;

const SALON_ID = `${SITE_URL}/#salon`;
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const absolute = (url: string) => (url.startsWith("/") ? `${SITE_URL}${url}` : url);

/** "9:00 AM" -> "09:00"; null when it isn't a time */
function to24h(time: string): string | null {
  const m = time.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i);
  if (!m) return null;
  let hour = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "p") hour += 12;
  return `${String(hour).padStart(2, "0")}:${m[2] ?? "00"}`;
}

/** The About page's hours ("Monday 9:00 AM - 8:00 PM", or "Closed") as opening hours */
function openingHours(about: Row): Json[] {
  return DAYS.flatMap((day) => {
    const value = text(about[`about_business_hours_${day}`]);
    const m = value.match(/(\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?)\s*[-–—to]+\s*(\d{1,2}(?::\d{2})?\s*[ap]\.?m\.?)/i);
    const opens = m && to24h(m[1]);
    const closes = m && to24h(m[2]);
    return opens && closes ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: `https://schema.org/${day}`, opens, closes }] : [];
  });
}

/** A read for the markup, or null when it fails or is slow (the page is built without it) */
const settled = <T>(read: () => Promise<T>): Promise<T | null> => readOrNull(read, "Schema markup read");

/** The salon: name, address, phone, hours, prices and social profiles */
export async function salonSchema(): Promise<Json | null> {
  const seo = await readSeoContent();
  const [home, about, services] = await Promise.all([
    settled(() => publicReads.content("home") as Promise<Row>),
    settled(() => publicReads.content("about") as Promise<Row>),
    settled(() => publicReads.services() as Promise<Row[]>),
  ]);
  if (!home && !about) return null;
  const h = home ?? {};
  const a = about ?? {};

  const address = text(a.about_location) || text(h.contact_location);
  const postalCode = address.match(/\b\d{4}\b/)?.[0];
  const prices = (services ?? []).flatMap((s) => [Number(s.junior_price), Number(s.master_price)]).filter((p) => p > 0);
  const sameAs = readSocialLinks(h)
    .filter((link) => link.platform !== "email" && /^https?:\/\//i.test(link.url))
    .map((link) => link.url.trim());
  const map = text(h.contact_location_url);

  return {
    "@context": "https://schema.org",
    "@type": "NailSalon",
    "@id": SALON_ID,
    name: SITE_NAME,
    url: SITE_URL,
    description: pageSeo("home", seo).description,
    image: absolute(siteOgImage(seo).url),
    logo: absolute(siteOgImage(seo).url),
    foundingDate: "2023",
    ...(text(h.contact_phone) && { telephone: text(h.contact_phone) }),
    ...(text(h.contact_email) && { email: text(h.contact_email) }),
    ...(address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: address,
        addressLocality: "Cagayan de Oro",
        addressRegion: "Misamis Oriental",
        ...(postalCode && { postalCode }),
        addressCountry: "PH",
      },
    }),
    // The embed address (…/maps/embed…) isn't a page people can open, so only a plain map link
    ...(map && !map.includes("/embed") && { hasMap: map }),
    ...(prices.length > 0 && { priceRange: `₱${Math.min(...prices).toLocaleString("en-PH")} - ₱${Math.max(...prices).toLocaleString("en-PH")}` }),
    currenciesAccepted: "PHP",
    openingHoursSpecification: openingHours(a),
    ...(sameAs.length > 0 && { sameAs }),
  };
}

/** One service, with its price range (junior to master technician) */
export function serviceSchema(service: Row): Json {
  const prices = [Number(service.junior_price), Number(service.master_price)].filter((p) => p > 0);
  const low = prices.length ? Math.min(...prices) : null;
  const high = prices.length ? Math.max(...prices) : null;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: text(service.name),
    serviceType: text(service.category_name) || text(service.category) || "Nail care",
    url: `${SITE_URL}${servicePath({ name: text(service.name) })}`,
    ...(text(service.description) && { description: text(service.description) }),
    ...(text(service.image) && { image: text(service.image) }),
    provider: { "@id": SALON_ID },
    areaServed: { "@type": "City", name: "Cagayan de Oro" },
    ...(low !== null &&
      high !== null && {
        offers:
          low === high
            ? { "@type": "Offer", price: low, priceCurrency: "PHP" }
            : { "@type": "AggregateOffer", lowPrice: low, highPrice: high, priceCurrency: "PHP" },
      }),
  };
}

/** An artist's specialties: the admin writes them as a "• one • two" list */
export function specialtiesOf(artist: Row): string[] {
  return splitSpecialties(text(artist.specialty));
}

/** One artist, as someone who works at the salon */
export function artistSchema(artist: Row): Json {
  const skills = specialtiesOf(artist);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: text(artist.name),
    jobTitle: text(publicPosition(artist)) || "Nail technician",
    ...(skills.length > 0 && { knowsAbout: skills }),
    url: `${SITE_URL}${artistPath({ name: text(artist.name) })}`,
    ...(text(artist.image) && { image: text(artist.image) }),
    ...(text(artist.bio) && { description: text(artist.bio) }),
    worksFor: { "@id": SALON_ID },
  };
}

/** The FAQ page's questions and answers */
export async function faqSchema(): Promise<Json | null> {
  const faqs = await settled(() => publicReads.faqs() as Promise<Row[]>);
  const items = (faqs ?? []).filter((f) => text(f.question) && text(f.answer));
  if (!items.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: text(f.question),
      acceptedAnswer: { "@type": "Answer", text: text(f.answer) },
    })),
  };
}

/** A trail from the home page to a page, e.g. Home › Services › BIAB Overlay */
export function breadcrumbSchema(trail: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({ "@type": "ListItem", position: i + 1, name: step.name, item: `${SITE_URL}${step.path}` })),
  };
}

// A service's page and an artist's page: the record behind the address, its metadata and its schema
// markup, for the segment layouts (which can only export what these return, the pages being client components)

/** The service an address names (its slug, or an old numeric id); null when none, or when the read is slow or fails */
export async function findService(param: string): Promise<NailService | null> {
  const list = await readOrNull(() => publicReads.services() as unknown as Promise<NailService[]>, "Service lookup");
  return list ? findBySlugOrId(list, decodeURIComponent(param)) : null;
}

/** The artist an address names (their slug, or an old numeric id); null when none, or when the read is slow or fails */
export async function findArtist(param: string): Promise<Nailist | null> {
  const list = await readOrNull(() => publicReads.nailists() as unknown as Promise<Nailist[]>, "Artist lookup");
  return list ? findBySlugOrId(list, decodeURIComponent(param)) : null;
}

/** A service's title, description (with its lowest price), photo and canonical address */
export async function serviceMetadata(service: NailService | null): Promise<Metadata> {
  if (!service) return NOT_FOUND_METADATA("Service");
  const content = await readSeoContent();
  const prices = [service.junior_price, service.master_price].filter((p) => Number(p) > 0).map(Number);
  const from = prices.length ? ` From ₱${Math.min(...prices).toLocaleString("en-PH")}.` : "";
  return seoMetadata({
    path: servicePath(service),
    title: service.name,
    description: shortDescription(
      service.description && `${service.description}${from}`,
      `${service.name} at Clawholics by Max, a nail art studio in Cagayan de Oro.${from} Book online.`,
    ),
    image: service.image,
    content,
  });
}

/** An artist's title (name and role), description, photo and canonical address */
export async function artistMetadata(artist: Nailist | null): Promise<Metadata> {
  if (!artist) return NOT_FOUND_METADATA("Artist");
  const content = await readSeoContent();
  const role = publicPosition(artist) || "Nail technician";
  return seoMetadata({
    path: artistPath(artist),
    title: `${artist.name}, ${role}`,
    description: shortDescription(artist.bio, `${artist.name} is a ${role.toLowerCase()} at Clawholics by Max in Cagayan de Oro. See their work and book with them.`),
    image: artist.image,
    content,
  });
}

/** A service's schema markup with its breadcrumbs */
export const serviceSchemas = (service: NailService): Json[] => [
  serviceSchema(service as unknown as Row),
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Services", path: PAGES.services.path },
    { name: service.name, path: servicePath(service) },
  ]),
];

/** An artist's schema markup with its breadcrumbs */
export const artistSchemas = (artist: Nailist): Json[] => [
  artistSchema(artist as unknown as Row),
  breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Artists", path: PAGES.artists.path },
    { name: artist.name, path: artistPath(artist) },
  ]),
];

// The saved search and sharing text (Admin > Search & Sharing): a slow or failed read leaves the
// defaults, so a page never loses its metadata
export async function readSeoContent(): Promise<SeoContent> {
  return (await readOrNull(() => publicReads.content("seo") as Promise<SeoContent>, "SEO content")) ?? {};
}

/** A page's metadata with its saved title, description and link preview picture */
export async function metadataFor(key: PageKey): Promise<Metadata> {
  return pageMetadata(key, await readSeoContent());
}
