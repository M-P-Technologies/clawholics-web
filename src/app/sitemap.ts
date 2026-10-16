import type { MetadataRoute } from "next";
import { PAGES, SITE_URL, type PageKey } from "@/lib/seo";
import { publicReads } from "@/server/publicCache";
import { readOrNull } from "@/server/timeLimit";
import { artistPath, servicePath } from "@/utils/slug";

// /sitemap.xml: every public page search engines should know about, with each service's and
// artist's page. Made when it's asked for, not during the build (a build's database reads can
// stall, and a sitemap frozen without its services would stay that way): the reads are the cached
// public ones, so it costs almost nothing, and an admin's catalog change shows at once.
export const dynamic = "force-dynamic";

/** The pages listed, and how much each matters next to the others */
const LISTED: [PageKey, number][] = [
  ["home", 1],
  ["services", 0.9],
  ["artists", 0.8],
  ["about", 0.7],
  ["contact", 0.7],
  ["faq", 0.6],
  ["terms", 0.3],
  ["privacy", 0.2],
  ["tou", 0.2],
];

/** The list, or none when the read fails or takes over 10s (the main pages are still listed) */
const listed = async <T,>(read: () => Promise<T[]>): Promise<T[]> => (await readOrNull(read, "Sitemap read", 10_000)) ?? [];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, artists] = await Promise.all([
    listed(() => publicReads.services() as unknown as Promise<{ name: string; image?: string }[]>),
    listed(() => publicReads.nailists() as unknown as Promise<{ name: string; image?: string }[]>),
  ]);
  return [
    ...LISTED.map(([key, priority]) => ({ url: `${SITE_URL}${PAGES[key].path === "/" ? "" : PAGES[key].path}`, priority })),
    ...services.map((s) => ({ url: `${SITE_URL}${servicePath(s)}`, priority: 0.8, ...(s.image && { images: [s.image] }) })),
    ...artists.map((a) => ({ url: `${SITE_URL}${artistPath(a)}`, priority: 0.6, ...(a.image && { images: [a.image] }) })),
  ];
}
