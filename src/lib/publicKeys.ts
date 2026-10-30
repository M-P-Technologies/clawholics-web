// The keys of the public site's queries (lib/publicQueries.ts), apart from the queries so the
// server can use them too: server/publicPrefetch.ts fills these keys before the page is drawn,
// and publicQueries' fetchers (browser code) aren't imported there.

/** The first part of every public query's key, so they can be dropped together */
export const PUBLIC = "public";

export const publicKeys = {
  home: [PUBLIC, "content", "home"],
  team: [PUBLIC, "content", "team"],
  legal: [PUBLIC, "content", "legal"],
  about: [PUBLIC, "content", "about"],
  carousel: [PUBLIC, "carousel"],
  services: [PUBLIC, "services"],
  categories: [PUBLIC, "categories"],
  faqs: [PUBLIC, "faqs"],
  tacs: [PUBLIC, "tacs"],
  paymentSettings: [PUBLIC, "paymentSettings"],
  bookingSettings: [PUBLIC, "bookingSettings"],
  nailists: [PUBLIC, "nailists"],
  service: (id: number) => [PUBLIC, "services", id] as const,
  serviceGallery: (id: number) => [PUBLIC, "services", id, "gallery"] as const,
  nailist: (id: number) => [PUBLIC, "nailists", id] as const,
  nailistGallery: (id: number) => [PUBLIC, "nailists", id, "gallery"] as const,
} as const;
