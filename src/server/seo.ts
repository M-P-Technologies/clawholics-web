import "server-only";
import { readSocialLinks } from "@/lib/socialLinkData";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import { servicePath, artistPath } from "@/utils/slug";
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
    description: SITE_DESCRIPTION,
    image: absolute(OG_IMAGE.url),
    logo: absolute(OG_IMAGE.url),
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
  return text(artist.specialty)
    .split(/[•\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/** One artist, as someone who works at the salon */
export function artistSchema(artist: Row): Json {
  const skills = specialtiesOf(artist);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: text(artist.name),
    jobTitle: text(artist.position) || "Nail technician",
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
