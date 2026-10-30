import "server-only";
import { revalidateTag, unstable_cache } from "next/cache";
import {
  getCarousel,
  getCategories,
  getContent,
  getFaqs,
  getNailist,
  getAllNailistGalleries,
  getNailistGallery,
  getNailists,
  getService,
  getServiceGallery,
  getServices,
  getTacs,
  type ContentSection,
} from "./catalog";
import { getPaymentSettings } from "./payments";

// The public site's reads, cached on the server: every visitor gets the same rows, which change
// only when an admin edits them, so most visits are answered without asking the database.
// - Only what anyone may see is cached. Admins (who also see hidden services and categories)
//   always read the database. The public reviews aren't cached: they show clients' names, which
//   change outside these writes (see handlers/reviews).
// - Every admin write to these tables is wrapped in `changesCatalog`, which drops the whole
//   cache: the reads join across tables (services, categories, artists), so one tag for all of
//   them can't miss a dependency, and writes are rare.
// - Changes made around the API (the db:copy script, the Supabase dashboard) show after
//   REVALIDATE_SECONDS at the latest.

export const CATALOG_TAG = "catalog";

/** The longest a cached copy is kept without a write clearing it */
const REVALIDATE_SECONDS = 60 * 60;

// The rows are stored as JSON, which is also how the routes answer, so a cached answer is the
// same as a fresh one
const cached = <A extends unknown[], R>(name: string, read: (...args: A) => PromiseLike<R>) =>
  unstable_cache(async (...args: A) => await read(...args), ["public", name], {
    tags: [CATALOG_TAG],
    revalidate: REVALIDATE_SECONDS,
  });

export const publicReads = {
  content: cached("content", (section: ContentSection) => getContent(section)),
  carousel: cached("carousel", getCarousel),
  faqs: cached("faqs", getFaqs),
  tacs: cached("tacs", getTacs),
  categories: cached("categories", () => getCategories(false)),
  services: cached("services", () => getServices(false)),
  service: cached("service", (id: number) => getService(id, false)),
  serviceGallery: cached("serviceGallery", getServiceGallery),
  nailists: cached("nailists", getNailists),
  nailist: cached("nailist", getNailist),
  nailistGallery: cached("nailistGallery", getNailistGallery),
  allNailistGalleries: cached("allNailistGalleries", getAllNailistGalleries),
  /** The downpayment and payment methods: the pages quote the deposit, and an admin's save of the Settings drops this too */
  paymentSettings: cached("paymentSettings", getPaymentSettings),
};

/** Drops every cached public read, so the next request reads the database again. */
function catalogChanged() {
  // expire: 0, not "max": the admin's editor fetches again right after saving, and must not be
  // answered with the copy from before the save
  revalidateTag(CATALOG_TAG, { expire: 0 });
}

/** Wraps an admin write: once it succeeds, the cached public reads are dropped. */
export function changesCatalog<C>(handler: (req: Request, context: C) => Response | Promise<Response>) {
  return async (req: Request, context: C) => {
    const res = await handler(req, context);
    if (res.ok) catalogChanged();
    return res;
  };
}
