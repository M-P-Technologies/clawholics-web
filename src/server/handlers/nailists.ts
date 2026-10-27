import "server-only";
import { requireAdmin } from "../auth";
import { getNailistRow } from "../catalog";
import { getSql } from "../db";
import { orNull, pgErrorCode, readJson, routeNotFound, toId } from "../http";
import { changesCatalog, publicReads } from "../publicCache";
import { ported } from "../worker";
import { parseIdList } from "./catalog";

// Nailist (artist) routes, ported from worker-api/src/index.ts (~lines 1286-1384). The GETs
// are public, as on the Worker; writes need an admin session.

type IdContext = { params: Promise<{ id: string }> };
type Body = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const badRequest = (message: string) => Response.json({ message }, { status: 400 });

// The Worker's getCategoryIdByPosition: the nailist_categories row named like `position`, or
// 2 (Junior) when there is none.
async function categoryIdFor(position: unknown) {
  const [category] = await getSql()<{ id: number }[]>`
    select id from nailist_categories where name = ${String(position ?? "")}
  `;
  return category?.id ?? 2;
}

export const createNailist = changesCatalog(ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<Body>(req);
  if (typeof body.name !== "string" || !body.name.trim()) return badRequest("Name is required.");
  const [{ id }] = await getSql()<{ id: number }[]>`
    insert into nailists (name, category_id, specialty, bio, image, display_order)
    values (${body.name}, ${await categoryIdFor(body.position)}, ${orNull(body.specialty)}, ${orNull(body.bio)}, ${orNull(body.image)},
      (select coalesce(max(display_order), 0) + 1 from nailists))
    returning id
  `;
  return Response.json(await getNailistRow(id), { status: 201 });
}));

// PUT /nailists/reorder (admin): { ids } is every artist in the order to show them
export const reorderNailists = changesCatalog(ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const ids = parseIdList((await readJson<{ ids?: unknown }>(req)).ids);
  if (!ids) return badRequest("ids must be a non-empty list of unique artist IDs.");
  await getSql().begin(async (tx) => {
    for (const [i, id] of ids.entries()) await tx`update nailists set display_order = ${i + 1} where id = ${id}`;
  });
  return Response.json({ message: "Artists reordered" });
}));

export const getNailistById = ported<IdContext>(async (_req, { params }) => {
  const id = toId((await params).id);
  const nailist = id === null ? null : await publicReads.nailist(id);
  return nailist ? Response.json(nailist) : routeNotFound();
});

export const updateNailist = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  const body = await readJson<Body>(req);
  if (typeof body.name !== "string" || !body.name.trim()) return badRequest("Name is required.");
  await getSql()`
    update nailists set name = ${body.name}, category_id = ${await categoryIdFor(body.position)},
      specialty = ${orNull(body.specialty)}, bio = ${orNull(body.bio)}, image = ${orNull(body.image)}
    where id = ${id}
  `;
  const updated = await getNailistRow(id);
  return updated ? Response.json(updated) : routeNotFound();
}));

// Past appointments keep their nailist_id and nailist_name. Time slots have no foreign key,
// so they're removed here too (the Worker left them behind).
export const deleteNailist = changesCatalog(ported<IdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id !== null) {
    await getSql().begin(async (tx) => {
      await tx`delete from nailist_time_slots where nailist_id = ${id}`;
      await tx`delete from nailists where id = ${id}`;
    });
  }
  return Response.json({ message: "Nailist deleted" });
}));

// --- SERVICES THE NAILIST OFFERS -------------------------------------------------------------

export const getNailistServices = ported<IdContext>(async (_req, { params }) => {
  const id = toId((await params).id);
  if (id === null) return Response.json([]);
  const rows = await getSql()<{ service_id: number }[]>`
    select service_id from nailist_services where nailist_id = ${id} order by service_id
  `;
  return Response.json(rows.map((r) => r.service_id));
});

// PUT { serviceIds: number[] } replaces the list; responds with the list sent.
export const setNailistServices = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  const { serviceIds } = await readJson<{ serviceIds?: unknown }>(req);
  if (!Array.isArray(serviceIds) || serviceIds.some((s) => toId(s) === null)) {
    return badRequest("serviceIds must be a list of service IDs.");
  }

  try {
    await getSql().begin(async (tx) => {
      await tx`delete from nailist_services where nailist_id = ${id}`;
      for (const serviceId of new Set(serviceIds.map(toId))) {
        await tx`insert into nailist_services (nailist_id, service_id) values (${id}, ${serviceId})`;
      }
    });
  } catch (error) {
    if (pgErrorCode(error) === "23503") return badRequest("Unknown nailist or service.");
    throw error;
  }
  return Response.json(serviceIds);
}));

// --- TIME SLOTS ------------------------------------------------------------------------------

// "9:0" -> "09:00"; anything else is returned trimmed
function padTime(time: string) {
  const [h, m] = (time || "").trim().split(":");
  return h && m ? `${h.padStart(2, "0")}:${m.padStart(2, "0")}` : (time || "").trim();
}

// GET: ["HH:MM-HH:MM", ...] sorted by start time
export const getNailistTimeSlots = ported<IdContext>(async (_req, { params }) => {
  const id = toId((await params).id);
  if (id === null) return Response.json([]);
  const rows = await getSql()<{ start_time: string; end_time: string }[]>`
    select start_time, end_time from nailist_time_slots where nailist_id = ${id} order by start_time
  `;
  return Response.json(rows.map((r) => `${padTime(r.start_time).slice(0, 5)}-${padTime(r.end_time).slice(0, 5)}`));
});

// PUT { timeSlots: ["HH:MM-HH:MM"] } replaces the slots. Malformed or backwards ranges are
// skipped, as on the Worker; responds with the de-duplicated list sent.
export const setNailistTimeSlots = ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  const body = await readJson<Body>(req);
  const rawSlots: unknown[] = Array.isArray(body.timeSlots) ? body.timeSlots : [];
  const timeSlots = [...new Set(rawSlots.filter((s): s is string => typeof s === "string"))];

  await getSql().begin(async (tx) => {
    await tx`delete from nailist_time_slots where nailist_id = ${id}`;
    for (const slot of timeSlots) {
      if (!slot.includes("-")) continue;
      const [start, end] = slot.split("-").map(padTime);
      if (!start || !end || start >= end) continue;
      await tx`
        insert into nailist_time_slots (nailist_id, start_time, end_time) values (${id}, ${start}, ${end})
        on conflict do nothing
      `;
    }
  });
  return Response.json(timeSlots);
});

// --- DAYS OFF --------------------------------------------------------------------------------

export const getNailistDayOffs = ported<IdContext>(async (_req, { params }) => {
  const id = toId((await params).id);
  const rows = id === null ? [] : await getSql()<{ day_off_type: string; day_of_week: number | null; date: string | null }[]>`
    select day_off_type, day_of_week, date from nailist_day_offs where nailist_id = ${id} order by id
  `;
  return Response.json({
    regularDays: rows.filter((r) => r.day_off_type === "REGULAR").map((r) => r.day_of_week),
    customDates: rows.filter((r) => r.day_off_type === "CUSTOM").map((r) => r.date),
  });
});

// PUT { regularDays: number[] (0-6), customDates: "YYYY-MM-DD"[] } replaces the days off.
export const setNailistDayOffs = ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  const { regularDays, customDates } = await readJson<{ regularDays?: unknown; customDates?: unknown }>(req);
  const validDays = Array.isArray(regularDays) && regularDays.every((d) => Number.isInteger(Number(d)) && Number(d) >= 0 && Number(d) <= 6);
  const validDates = Array.isArray(customDates) && customDates.every((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
  if (!validDays || !validDates) {
    return badRequest("regularDays must be weekdays (0-6) and customDates must be YYYY-MM-DD dates.");
  }

  try {
    await getSql().begin(async (tx) => {
      await tx`delete from nailist_day_offs where nailist_id = ${id}`;
      for (const day of regularDays) {
        await tx`insert into nailist_day_offs (nailist_id, day_off_type, day_of_week) values (${id}, 'REGULAR', ${Number(day)}) on conflict do nothing`;
      }
      for (const date of customDates) {
        await tx`insert into nailist_day_offs (nailist_id, day_off_type, date) values (${id}, 'CUSTOM', ${date}) on conflict do nothing`;
      }
    });
  } catch (error) {
    if (pgErrorCode(error) === "23503") return routeNotFound();
    throw error;
  }
  return Response.json({ regularDays, customDates });
});

// --- ARTIST GALLERY --------------------------------------------------------------------------
// Photos of an artist's work (new: the Worker has no such routes). Reading is public; adding and
// removing photos needs an admin.

const MAX_GALLERY_PHOTOS = 10;

export const getGallery = ported<IdContext>(async (_req, { params }) => {
  const id = toId((await params).id);
  return Response.json(id === null ? [] : await publicReads.nailistGallery(id));
});

export const addGalleryImage = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const nailistId = toId((await params).id);
  if (nailistId === null) return Response.json({ message: "Nailist not found" }, { status: 404 });
  const body = await readJson<Body>(req);
  if (typeof body.image_url !== "string" || !body.image_url) return badRequest("image_url is required.");

  const sql = getSql();
  const [nailist] = await sql`select 1 from nailists where id = ${nailistId}`;
  if (!nailist) return Response.json({ message: "Nailist not found" }, { status: 404 });
  const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from nailist_gallery where nailist_id = ${nailistId}`;
  if (count >= MAX_GALLERY_PHOTOS) return badRequest("An artist can only have up to 10 photos.");

  try {
    const [created] = await sql`
      insert into nailist_gallery (nailist_id, image_url, position)
      values (${nailistId}, ${body.image_url}, ${body.position ?? count + 1})
      returning id
    `;
    return Response.json(created, { status: 201 });
  } catch (error) {
    if (pgErrorCode(error) === "23505") return Response.json({ message: "This photo is already in the gallery." }, { status: 409 });
    throw error;
  }
}));

export const deleteGalleryImage = changesCatalog(ported<IdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id !== null) await getSql()`delete from nailist_gallery where id = ${id}`;
  return Response.json({ message: "Image deleted" });
}));
