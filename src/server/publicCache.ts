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
// - The artists' galleries also carry GALLERY_TAG: completing a visit adds its photo to one, and
//   that happens many times a day, so it drops only the gallery reads (and the artist pages built
//   from them) through `changesGallery`, not every page of the site.
// - Changes made around the API (the db:copy script, the Supabase dashboard) show after
//   REVALIDATE_SECONDS plus the pages' hour (the site layout's `revalidate`) at the latest. It's
//   long on purpose: every expiry reads the database again and stores the copy (an ISR write).
//   A failed read isn't stored, so a database hiccup never sticks here.

export const CATALOG_TAG = "catalog";
export const GALLERY_TAG = "gallery";

/** The longest a cached copy is kept without a write clearing it (a day) */
export const REVALIDATE_SECONDS = 24 * 60 * 60;

// The rows are stored as JSON, which is also how the routes answer, so a cached answer is the
// same as a fresh one
const cached = <A extends unknown[], R>(name: string, read: (...args: A) => PromiseLike<R>, tags = [CATALOG_TAG]) =>
  unstable_cache(async (...args: A) => await read(...args), ["public", name], {
    tags,
    revalidate: REVALIDATE_SECONDS,
  });
const galleryTags = [CATALOG_TAG, GALLERY_TAG];

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
  nailistGallery: cached("nailistGallery", getNailistGallery, galleryTags),
  allNailistGalleries: cached("allNailistGalleries", getAllNailistGalleries, galleryTags),
  /** The downpayment and payment methods: the pages quote the deposit, and an admin's save of the Settings drops this too */
  paymentSettings: cached("paymentSettings", getPaymentSettings),
};

type Handler<C> = (req: Request, context: C) => Response | Promise<Response>;

/** Wraps an admin write: once it succeeds, the cached reads under `tag` are dropped. */
function dropsTag<C>(tag: string, handler: Handler<C>): Handler<C> {
  return async (req: Request, context: C) => {
    const res = await handler(req, context);
    // expire: 0, not "max": the admin's editor fetches again right after saving, and must not be
    // answered with the copy from before the save
    if (res.ok) revalidateTag(tag, { expire: 0 });
    return res;
  };
}

/** Wraps an admin write: once it succeeds, every cached public read is dropped. */
export const changesCatalog = <C>(handler: Handler<C>) => dropsTag(CATALOG_TAG, handler);

/** Wraps a write that only touches the artists' galleries (completing a visit, its photo). */
export const changesGallery = <C>(handler: Handler<C>) => dropsTag(GALLERY_TAG, handler);
