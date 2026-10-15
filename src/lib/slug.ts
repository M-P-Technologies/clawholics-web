/** "Hard Gel & BIAB" -> "hard-gel-biab": lower case, letters and digits, words joined by hyphens. */
export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The address of an artist's page, named after the artist. */
export const artistPath = (artist: { name: string }) => `/artists/${slugify(artist.name)}`;

/** The address of a service's page, named after the service. */
export const servicePath = (service: { name: string }) => `/services/${slugify(service.name)}`;

/**
 * The service (or artist) an address points to: by its name's slug (/services/hard-gel), or by id for the
 * numeric addresses used before (/services/2). The service whose name comes first wins when two
 * names make the same slug.
 */
export function findBySlugOrId<T extends { id: number; name: string }>(items: T[], param: string): T | null {
  if (/^\d+$/.test(param)) return items.find((s) => s.id === Number(param)) ?? null;
  const wanted = param.toLowerCase();
  return items.find((s) => slugify(s.name) === wanted) ?? null;
}
