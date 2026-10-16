import "server-only";
import { requireAdmin } from "../auth";
import { getService, isContentSection } from "../catalog";
import { getSql } from "../db";
import { orNull, pgErrorCode, readJson, routeNotFound, toId } from "../http";
import { imageBytes, NOT_AN_IMAGE } from "../imageFiles";
import { createImageKey, publicBaseUrl, putObject } from "../r2";
import { changesCatalog } from "../publicCache";
import { forwardToWorker, ported } from "../worker";

// Admin writes for the CMS and the catalog, ported from worker-api/src/index.ts
// (~lines 1036-1275 and the /upload-image route). Bodies, status codes and messages match the
// Worker; every write needs an admin session (the Worker checked a clerk_id header), and
// writes that touch several rows run in one transaction.

type IdContext = { params: Promise<{ id: string }> };
type SectionContext = { params: Promise<{ section: string }> };
type Body = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const message = (text: string, status: number, extra: object = {}) => Response.json({ message: text, ...extra }, { status });

// --- CONTENT ---------------------------------------------------------------------------------

// PUT /content/{home,about,team,contact}: { updates: [{ key, value }] }, { key, value }, or a
// plain { key: value } object. Any key can be written from any section, as on the Worker.
export const updateContent = changesCatalog(ported<SectionContext>(async (req, { params }) => {
  const { section } = await params;
  if (!isContentSection(section)) return forwardToWorker(req);
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const body = await readJson<Body>(req);
  const entries: [string, unknown][] = Array.isArray(body.updates)
    ? body.updates.filter((item: Body) => item?.key).map((item: Body) => [String(item.key), item.value])
    : body.key
      ? [[String(body.key), body.value]]
      : Object.entries(body);

  await getSql().begin(async (tx) => {
    for (const [key, value] of entries) {
      await tx`
        insert into content (key, value) values (${key}, ${String(value ?? "")})
        on conflict (key) do update set value = excluded.value
      `;
    }
  });
  return Response.json({ message: "Content updated" });
}));

const UPLOAD_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;

// POST /content/:section/upload-image (multipart `image`): the About page's image upload.
// The Worker took any file; here only JPG, PNG or WEBP images up to 4MB.
export const uploadContentImage = ported<SectionContext>(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const file = (await req.formData().catch(() => null))?.get("image");
  if (!file || typeof file === "string") return Response.json({ error: "No image file provided" }, { status: 400 });
  if (!UPLOAD_IMAGE_TYPES.includes(file.type)) {
    return Response.json({ error: "Invalid image type. Only JPG, PNG, and WEBP are allowed." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_SIZE) return Response.json({ error: "Image must be 4MB or smaller." }, { status: 400 });

  const bytes = await imageBytes(file);
  if (!bytes) return Response.json({ error: NOT_AN_IMAGE }, { status: 400 });

  const key = createImageKey("content", file.name);
  const imageUrl = `${publicBaseUrl()}/${key}`;
  await putObject(key, bytes, file.type);
  return Response.json({ imageUrl, key });
});

// --- CAROUSEL --------------------------------------------------------------------------------

// PUT /carousel: { images: [{ image_url }] } replaces the carousel, in that order.
export const updateCarousel = changesCatalog(ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;

  const { images } = await readJson<{ images?: unknown }>(req);
  if (!Array.isArray(images)) return message("Images array required", 400);
  if (!images.every((img) => typeof img?.image_url === "string" && img.image_url)) {
    return message("Each image needs an image_url", 400);
  }

  await getSql().begin(async (tx) => {
    await tx`delete from home_carousel`;
    for (const [i, img] of images.entries()) {
      await tx`insert into home_carousel (image_url, position) values (${img.image_url}, ${i + 1})`;
    }
  });
  return Response.json({ message: "Carousel updated" });
}));

// --- FAQS AND TERMS ------------------------------------------------------------------------

export const createFaq = changesCatalog(ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<Body>(req);
  const [created] = await getSql()`
    insert into faqs (question, answer, display_order)
    values (${orNull(body.question)}, ${orNull(body.answer)}, ${body.display_order || 0})
    returning *
  `;
  return Response.json(created, { status: 201 });
}));

export const updateFaq = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  const body = await readJson<Body>(req);
  const [updated] = await getSql()`
    update faqs set question = coalesce(${orNull(body.question)}, question), answer = coalesce(${orNull(body.answer)}, answer),
      display_order = coalesce(${orNull(body.display_order)}, display_order)
    where id = ${id} returning *
  `;
  return updated ? Response.json(updated) : routeNotFound();
}));

export const deleteFaq = changesCatalog(ported<IdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id !== null) await getSql()`delete from faqs where id = ${id}`;
  return Response.json({ message: "FAQ deleted" });
}));

export const createTac = changesCatalog(ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<Body>(req);
  if (!body.section || !body.content) return message("Section and content are required.", 400);
  const [created] = await getSql()`
    insert into terms_and_conditions (section, content, display_order)
    values (${body.section}, ${body.content}, ${body.display_order || 0})
    returning *
  `;
  return Response.json(created, { status: 201 });
}));

export const updateTac = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  const body = await readJson<Body>(req);
  const [updated] = await getSql()`
    update terms_and_conditions set section = coalesce(${orNull(body.section)}, section),
      content = coalesce(${orNull(body.content)}, content),
      display_order = coalesce(${orNull(body.display_order)}, display_order)
    where id = ${id} returning *
  `;
  return updated ? Response.json(updated) : routeNotFound();
}));

export const deleteTac = changesCatalog(ported<IdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id !== null) await getSql()`delete from terms_and_conditions where id = ${id}`;
  return Response.json({ message: "TAC deleted" });
}));

// --- SERVICE CATEGORIES ----------------------------------------------------------------------

const slugify = (text: string) => text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const toActiveFlag = (value: unknown, fallback: number) =>
  value === undefined || value === null ? fallback : value === true || value === 1 || value === "1" || value === "true" ? 1 : 0;

// Reorder payloads: a non-empty list of unique positive integer IDs
function parseIdList(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const ids = value.map(toId);
  return ids.every((id) => id !== null) && new Set(ids).size === ids.length ? (ids as number[]) : null;
}

const DUPLICATE_CATEGORY = "A category with this name or slug already exists.";

export const reorderCategories = changesCatalog(ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const ids = parseIdList((await readJson<{ ids?: unknown }>(req)).ids);
  if (!ids) return message("ids must be a non-empty list of unique category IDs.", 400);
  await getSql().begin(async (tx) => {
    for (const [i, id] of ids.entries()) await tx`update service_categories set position = ${i + 1} where id = ${id}`;
  });
  return Response.json({ message: "Categories reordered" });
}));

export const createCategory = changesCatalog(ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<Body>(req);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = slugify(typeof body.slug === "string" && body.slug.trim() ? body.slug : name);
  if (!name || !slug) return message("Category name is required.", 400);

  const sql = getSql();
  const [duplicate] = await sql`select 1 from service_categories where lower(name) = lower(${name}) or slug = ${slug}`;
  if (duplicate) return message(DUPLICATE_CATEGORY, 409);
  try {
    const [created] = await sql`
      insert into service_categories (name, slug, description, image, is_active, position)
      values (${name}, ${slug}, ${orNull(body.description)}, ${orNull(body.image)}, ${toActiveFlag(body.is_active, 1)},
        (select coalesce(max(position), 0) + 1 from service_categories))
      returning *
    `;
    return Response.json(created, { status: 201 });
  } catch (error) {
    if (pgErrorCode(error) === "23505") return message(DUPLICATE_CATEGORY, 409);
    throw error;
  }
}));

export const updateCategory = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  const sql = getSql();
  const [existing] = id === null ? [] : await sql`select * from service_categories where id = ${id}`;
  if (!existing) return message("Category not found", 404);

  const body = await readJson<Body>(req);
  const name = body.name === undefined ? existing.name : String(body.name).trim();
  const slug = body.slug === undefined ? existing.slug : slugify(String(body.slug));
  if (!name || !slug) return message("Category name and slug cannot be empty.", 400);
  const [duplicate] = await sql`
    select 1 from service_categories where (lower(name) = lower(${name}) or slug = ${slug}) and id <> ${id}
  `;
  if (duplicate) return message(DUPLICATE_CATEGORY, 409);

  try {
    const [updated] = await sql.begin(async (tx) => {
      const rows = await tx`
        update service_categories set name = ${name}, slug = ${slug},
          description = ${body.description === undefined ? existing.description : body.description},
          image = ${body.image === undefined ? existing.image : body.image},
          is_active = ${toActiveFlag(body.is_active, existing.is_active)}
        where id = ${id} returning *
      `;
      // services.category (legacy text) follows the category name
      await tx`update services set category = ${name} where category_id = ${id}`;
      return rows;
    });
    return Response.json(updated);
  } catch (error) {
    if (pgErrorCode(error) === "23505") return message(DUPLICATE_CATEGORY, 409);
    throw error;
  }
}));

// DELETE /categories/:id[?reassign_to=]: a category with services needs reassign_to, and its
// services move there.
export const deleteCategory = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  const sql = getSql();
  const [existing] = id === null ? [] : await sql`select id from service_categories where id = ${id}`;
  if (!existing) return message("Category not found", 404);

  const [{ count: serviceCount }] = await sql<{ count: number }[]>`
    select count(*)::int as count from services where category_id = ${id}
  `;
  if (serviceCount === 0) {
    await sql`delete from service_categories where id = ${id}`;
    return Response.json({ message: "Category deleted" });
  }

  const reassignParam = new URL(req.url).searchParams.get("reassign_to");
  if (!reassignParam) {
    return message(
      `This category still has ${serviceCount} service(s). Move them to another category first, or pass reassign_to.`,
      409,
      { service_count: serviceCount },
    );
  }
  const targetId = toId(reassignParam);
  const [target] = targetId === null ? [] : await sql<{ id: number; name: string }[]>`
    select id, name from service_categories where id = ${targetId}
  `;
  if (!target || target.id === id) return message("reassign_to must be a different, existing category.", 400);

  const reassigned = await sql.begin(async (tx) => {
    const moved = await tx`update services set category_id = ${target.id}, category = ${target.name} where category_id = ${id}`;
    await tx`delete from service_categories where id = ${id}`;
    return moved.count;
  });
  return Response.json({ message: "Category deleted", reassigned, reassigned_to: target.id });
}));

// --- SERVICES --------------------------------------------------------------------------------

const PRICING_MODES = ["tiered", "single"];

// 'tiered' services need both prices; 'single' ones take master_price for every artist and
// store junior_price equal to it. pricing_mode is kept as-is on update when it isn't sent.
// Prices are whole pesos (integer columns).
function resolvePricing(body: Body, currentMode = "tiered") {
  const mode = body.pricing_mode === undefined || body.pricing_mode === null || body.pricing_mode === ""
    ? currentMode
    : String(body.pricing_mode).trim().toLowerCase();
  if (!PRICING_MODES.includes(mode)) return { error: `pricing_mode must be one of: ${PRICING_MODES.join(", ")}` };
  if (!body.master_price || (mode === "tiered" && !body.junior_price)) return { error: "Fields cannot be empty." };
  const master = Number(body.master_price);
  const junior = mode === "single" ? master : Number(body.junior_price);
  if (!Number.isInteger(master) || master <= 0 || !Number.isInteger(junior) || junior <= 0) return { error: "Invalid price." };
  return { mode, master, junior };
}

// category_id must exist; a legacy category name is matched case-insensitively and created
// if missing, so the admin form (which sends names) keeps working. null when neither is sent.
async function resolveServiceCategory(body: Body): Promise<{ id: number; name: string } | null | "unknown"> {
  const sql = getSql();
  if (body.category_id !== undefined && body.category_id !== null && body.category_id !== "") {
    const categoryId = toId(body.category_id);
    const [cat] = categoryId === null ? [] : await sql<{ id: number; name: string }[]>`
      select id, name from service_categories where id = ${categoryId}
    `;
    return cat ?? "unknown";
  }
  const name = typeof body.category === "string" ? body.category.trim() : "";
  if (!name) return null;
  const slug = slugify(name) || `category-${Date.now()}`;
  // A name that slugifies to an existing slug ("Manicure!" vs "Manicure") reuses that category
  const [existing] = await sql<{ id: number; name: string }[]>`
    select id, name from service_categories where lower(name) = lower(${name}) or slug = ${slug}
    order by (lower(name) = lower(${name})) desc limit 1
  `;
  if (existing) return existing;
  const [created] = await sql<{ id: number; name: string }[]>`
    insert into service_categories (name, slug, position)
    values (${name}, ${slug}, (select coalesce(max(position), 0) + 1 from service_categories))
    on conflict do nothing
    returning id, name
  `;
  return created ?? "unknown";
}

const serviceNotFound = () => message("Service not found", 404);
const text = (value: unknown) => (value === undefined || value === null ? null : String(value));

export const reorderServices = changesCatalog(ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const ids = parseIdList((await readJson<{ ids?: unknown }>(req)).ids);
  if (!ids) return message("ids must be a non-empty list of unique service IDs.", 400);
  await getSql().begin(async (tx) => {
    for (const [i, id] of ids.entries()) await tx`update services set position = ${i + 1} where id = ${id}`;
  });
  return Response.json({ message: "Services reordered" });
}));

export const createService = changesCatalog(ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<Body>(req);
  const category = await resolveServiceCategory(body);
  if (category === "unknown") return message("Unknown service category.", 400);
  const pricing = resolvePricing(body);
  if ("error" in pricing) return message(pricing.error!, 400);

  const [{ id }] = await getSql()<{ id: number }[]>`
    insert into services (name, category, category_id, description, master_price, junior_price, pricing_mode, duration, image, is_active, position)
    values (${text(body.name)}, ${category?.name ?? null}, ${category?.id ?? null}, ${text(body.description)},
      ${pricing.master}, ${pricing.junior}, ${pricing.mode}, ${text(body.duration)}, ${text(body.image)},
      ${toActiveFlag(body.is_active, 1)}, (select coalesce(max(position), 0) + 1 from services))
    returning id
  `;
  return Response.json(await getService(id, true), { status: 201 });
}));

export const updateService = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  const sql = getSql();
  const [existing] = id === null ? [] : await sql<{ pricing_mode: string }[]>`select pricing_mode from services where id = ${id}`;
  if (!existing) return serviceNotFound();

  const body = await readJson<Body>(req);
  const pricing = resolvePricing(body, existing.pricing_mode);
  if ("error" in pricing) return message(pricing.error!, 400);
  const category = await resolveServiceCategory(body);
  if (category === "unknown") return message("Unknown service category.", 400);

  // Category and visibility are kept as-is when the request doesn't send them
  await sql`
    update services set name = ${text(body.name)},
      category = coalesce(${category?.name ?? null}, category), category_id = coalesce(${category?.id ?? null}, category_id),
      description = ${text(body.description)}, master_price = ${pricing.master}, junior_price = ${pricing.junior},
      pricing_mode = ${pricing.mode}, duration = ${text(body.duration)}, image = ${text(body.image)},
      is_active = coalesce(${body.is_active === undefined ? null : toActiveFlag(body.is_active, 1)}, is_active)
    where id = ${id}
  `;
  const updated = await getService(id!, true);
  return updated ? Response.json(updated) : serviceNotFound();
}));

// Appointments keep pointing at service_id, so a booked service is archived (hidden) instead
export const deleteService = changesCatalog(ported<IdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return Response.json({ message: "Service deleted", deleted: true });
  const sql = getSql();
  const [booked] = await sql`select 1 from appointments where service_id = ${id} limit 1`;
  if (booked) {
    await sql`update services set is_active = 0 where id = ${id}`;
    return Response.json({ message: "Service has bookings, so it was archived instead of deleted.", archived: true });
  }
  await sql`delete from services where id = ${id}`;
  return Response.json({ message: "Service deleted", deleted: true });
}));

// --- SERVICE GALLERY -------------------------------------------------------------------------

const MAX_GALLERY_PHOTOS = 10;

export const addGalleryImage = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const serviceId = toId((await params).id);
  if (serviceId === null) return serviceNotFound();
  const body = await readJson<Body>(req);
  if (typeof body.image_url !== "string" || !body.image_url) return message("image_url is required.", 400);

  const sql = getSql();
  const [service] = await sql`select 1 from services where id = ${serviceId}`;
  if (!service) return serviceNotFound();
  const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from service_gallery where service_id = ${serviceId}`;
  if (count >= MAX_GALLERY_PHOTOS) return message("A service can only have up to 10 photos.", 400);

  try {
    const [created] = await sql`
      insert into service_gallery (service_id, image_url, position)
      values (${serviceId}, ${body.image_url}, ${body.position ?? count + 1})
      returning id
    `;
    return Response.json(created, { status: 201 });
  } catch (error) {
    if (pgErrorCode(error) === "23505") return message("This photo is already in the gallery.", 409);
    throw error;
  }
}));

// PUT/DELETE /gallery/:id. The Worker left these open to anyone (/gallery wasn't in its admin
// route list); here they need an admin.
export const updateGalleryImage = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  const { position } = await readJson<Body>(req);
  if (toId(position) === null && position !== 0) return message("position must be a number.", 400);
  if (id !== null) {
    try {
      await getSql()`update service_gallery set position = ${Number(position)} where id = ${id}`;
    } catch (error) {
      if (pgErrorCode(error) === "23505") return message("Another photo already has this position.", 409);
      throw error;
    }
  }
  return Response.json({ message: "Updated successfully" });
}));

export const deleteGalleryImage = changesCatalog(ported<IdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id !== null) await getSql()`delete from service_gallery where id = ${id}`;
  return Response.json({ message: "Image deleted" });
}));
