import type { MetadataRoute } from "next";
import { PAGES, SITE_URL, type PageKey } from "@/lib/seo";
import { publicReads } from "@/server/publicCache";
import { artistPath, servicePath } from "@/utils/slug";

// /sitemap.xml: every public page search engines should know about, with each service's and
// artist's page. Rebuilt when an admin changes the catalog (the reads are tagged `catalog`) and
// at least hourly.
export const revalidate = 3600;

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

const listed = async <T,>(read: () => Promise<T[]>): Promise<T[]> => {
  try {
    return await read();
  } catch {
    return [];
  }
};

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
