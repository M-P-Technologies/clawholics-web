import "server-only";
import { getSql } from "./db";

// Read queries for the public catalog and CMS, ported from worker-api/src/index.ts. Each
// returns the same rows, columns and order as the Worker endpoint, so the frontend can't tell
// which backend answered.

// Worker formatContent: rows of { key, value } become one { [key]: value } object.
const formatContent = (rows: { key: string; value: string | null }[]) =>
  Object.fromEntries(rows.map((row) => [row.key, row.value]));

const CONTENT_PREFIXES = {
  home: ["home_%", "social_%", "contact_%"],
  about: ["about_%"],
  team: ["team_%"],
  contact: ["contact_%", "social_%"],
  // The legal pages' text (e.g. legal_privacy_html), apart from home so it isn't sent with every
  // page's content. New with the Next API: the Worker has no such section.
  legal: ["legal_%"],
} as const;

export type ContentSection = keyof typeof CONTENT_PREFIXES;

export const isContentSection = (value: string): value is ContentSection => Object.hasOwn(CONTENT_PREFIXES, value);

export async function getContent(section: ContentSection) {
  const sql = getSql();
  // key LIKE 'home_%' OR key LIKE 'social_%' ..., as the Worker queries it. SQLite's LIKE
  // ignores ASCII case, so this is ILIKE.
  const matches = CONTENT_PREFIXES[section]
    .map((prefix) => sql`key ilike ${prefix}`)
    .reduce((acc, condition) => sql`${acc} or ${condition}`);
  const rows = await sql<{ key: string; value: string | null }[]>`
    select key, value from content where ${matches} order by id
  `;
  return formatContent(rows);
}

export const getCarousel = () => getSql()`
  select id, image_url, position from home_carousel order by position asc, id asc
`;

export const getFaqs = () => getSql()`
  select id, question, answer, display_order from faqs order by display_order asc, id asc
`;

export const getTacs = () => getSql()`
  select id, section, content, display_order from terms_and_conditions order by display_order asc, id asc
`;

export function getCategories(admin: boolean) {
  const sql = getSql();
  return admin
    ? sql`
        select c.*, (select count(*)::int from services s where s.category_id = c.id) as service_count
        from service_categories c order by c.position asc, c.id asc
      `
    : sql`
        select id, name, slug, description, image, position
        from service_categories where is_active = 1 order by position asc, id asc
      `;
}

// Worker SERVICE_SELECT / PUBLIC_SERVICE_FILTER. GROUP_CONCAT(ns.nailist_id) becomes
// string_agg, still a comma-separated string (or null when no artist offers it).
const serviceSelect = () => getSql()`
  select s.*, c.name as category_name,
    string_agg(ns.nailist_id::text, ',' order by ns.nailist_id) as nailist_ids
  from services s
  left join service_categories c on s.category_id = c.id
  left join nailist_services ns on s.id = ns.service_id
`;

const publicServiceFilter = () => getSql()`s.is_active = 1 and (c.id is null or c.is_active = 1)`;

export function getServices(admin: boolean) {
  const sql = getSql();
  return sql`
    ${serviceSelect()}
    ${admin ? sql`` : sql`where ${publicServiceFilter()}`}
    group by s.id, c.name
    order by s.position asc, s.id asc
  `;
}

export async function getService(id: number, admin: boolean) {
  const sql = getSql();
  const [service] = await sql`
    ${serviceSelect()}
    where s.id = ${id} ${admin ? sql`` : sql`and ${publicServiceFilter()}`}
    group by s.id, c.name
  `;
  return service ?? null;
}

export const getServiceGallery = (serviceId: number) => getSql()`
  select * from service_gallery where service_id = ${serviceId} order by position asc limit 10
`;

export const getNailistGallery = (nailistId: number) => getSql()`
  select * from nailist_gallery where nailist_id = ${nailistId} order by position asc limit 10
`;

// One query instead of the Worker's two extra queries per artist.
const nailistsWithServices = (id: number | null) => {
  const sql = getSql();
  return sql`
    select n.id, n.name, n.category_id, nc.name as position, n.specialty, n.bio, n.image,
      coalesce(array_agg(ns.service_id order by ns.service_id) filter (where ns.service_id is not null), '{}') as service_ids,
      coalesce(array_agg(s.name order by ns.service_id) filter (where s.id is not null), '{}') as offered_services
    from nailists n
    left join nailist_categories nc on n.category_id = nc.id
    left join nailist_services ns on ns.nailist_id = n.id
    left join services s on s.id = ns.service_id
    ${id === null ? sql`` : sql`where n.id = ${id}`}
    group by n.id, nc.name
    order by n.id asc
  `;
};

export const getNailists = () => nailistsWithServices(null);

export async function getNailist(id: number) {
  const [nailist] = await nailistsWithServices(id);
  return nailist ?? null;
}

/** A nailist row without the service lists (what the Worker returns after a write). */
export async function getNailistRow(id: number) {
  const [nailist] = await getSql()`
    select n.id, n.name, n.category_id, nc.name as position, n.specialty, n.bio, n.image
    from nailists n left join nailist_categories nc on n.category_id = nc.id where n.id = ${id}
  `;
  return nailist ?? null;
}
