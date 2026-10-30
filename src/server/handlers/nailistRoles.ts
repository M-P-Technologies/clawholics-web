import "server-only";
import { requireAdmin } from "../auth";
import { getSql } from "../db";
import { pgErrorCode, readJson, routeNotFound, toId } from "../http";
import { changesCatalog } from "../publicCache";
import { ported } from "../worker";

// The roles an artist can have (nailist_categories): a name, and whether artists with it charge the
// master price or the junior price. Admin only; the artist's role reaches the site through the artists.

type IdContext = { params: Promise<{ id: string }> };
type Body = { name?: unknown; is_master?: unknown };

const MAX_NAME = 40;
const badRequest = (message: string) => Response.json({ message }, { status: 400 });

const roleList = () => getSql()`
  select c.id, c.name, c.is_master, (select count(*)::int from nailists n where n.category_id = c.id) as artists
  from nailist_categories c order by c.is_master desc, c.id`;

const cleanName = (value: unknown) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "");

export const listNailistRoles = ported(async () => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  return Response.json(await roleList());
});

export const createNailistRole = changesCatalog(ported(async (req) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const body = await readJson<Body>(req);
  const name = cleanName(body.name);
  if (!name || name.length > MAX_NAME) return badRequest(`Give the role a name of up to ${MAX_NAME} characters.`);
  try {
    await getSql()`insert into nailist_categories (name, is_master) values (${name}, ${body.is_master ? 1 : 0})`;
  } catch (error) {
    if (pgErrorCode(error) === "23505") return Response.json({ message: "There's already a role with that name." }, { status: 409 });
    throw error;
  }
  return Response.json(await roleList(), { status: 201 });
}));

export const updateNailistRole = changesCatalog(ported<IdContext>(async (req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  const body = await readJson<Body>(req);
  const name = cleanName(body.name);
  if (!name || name.length > MAX_NAME) return badRequest(`Give the role a name of up to ${MAX_NAME} characters.`);
  try {
    const done = await getSql()`update nailist_categories set name = ${name}, is_master = ${body.is_master ? 1 : 0} where id = ${id} returning id`;
    if (done.length === 0) return routeNotFound();
  } catch (error) {
    if (pgErrorCode(error) === "23505") return Response.json({ message: "There's already a role with that name." }, { status: 409 });
    throw error;
  }
  return Response.json(await roleList());
}));

// A role in use can't go: its artists would have none (and past bookings read it for their price)
export const deleteNailistRole = changesCatalog(ported<IdContext>(async (_req, { params }) => {
  const admin = await requireAdmin();
  if (admin instanceof Response) return admin;
  const id = toId((await params).id);
  if (id === null) return routeNotFound();
  const sql = getSql();
  const [{ used }] = await sql<{ used: number }[]>`select count(*)::int as used from nailists where category_id = ${id}`;
  if (used > 0) return Response.json({ message: "Move the artists with this role to another role first." }, { status: 409 });
  const [{ total }] = await sql<{ total: number }[]>`select count(*)::int as total from nailist_categories`;
  if (total <= 1) return Response.json({ message: "Keep at least one role." }, { status: 409 });
  await sql`delete from nailist_categories where id = ${id}`;
  return Response.json(await roleList());
}));
