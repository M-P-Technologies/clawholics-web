// @vitest-environment node
// Integration test for the ported public GETs against a real, throwaway Postgres.
// Needs TEST_DATABASE_URL (never the Supabase project): `npm run test:db` starts one in
// Docker. The schema is dropped and rebuilt from the migration and seed before the tests.
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock(), clerkClient: async () => ({}) }));

const get = (route: { GET: (req: Request, ctx: never) => Promise<Response> | Response }, url: string, params?: object) =>
  callRoute(route.GET, url, { params });

describe.skipIf(!TEST_DATABASE_URL)("ported public GETs (Postgres)", () => {
  let admin: ReturnType<typeof postgres>;

  beforeAll(async () => {
    admin = await resetTestDatabase();
    // A hidden service and an inactive category, to check the public filters
    await admin`update services set is_active = 0 where id = 1`;
    await admin`insert into service_categories (name, slug, is_active) values ('Hidden', 'hidden', 0)`;
    await admin`insert into users (clerk_id, email, role) values ('user_admin', 'admin@x.test', 'admin')`;
  });

  afterAll(async () => {
    await admin?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("TC-PG-01: content sections return one { key: value } object with the Worker's key filters", async () => {
    const route = await import("../../app/api/content/[section]/route");
    const home = await get(route, "/api/content/home", { section: "home" });
    expect(home.status).toBe(200);
    expect(home.body.home_title).toBe("Clawholics.");
    expect(Object.keys(home.body).every((k) => /^(home|social|contact)_/.test(k))).toBe(true);
    const about = await get(route, "/api/content/about", { section: "about" });
    expect(Object.keys(about.body).length).toBeGreaterThan(0);
    expect(Object.keys(about.body).every((k) => k.startsWith("about_"))).toBe(true);
  });

  it("TC-PG-02: carousel, FAQs and terms keep the Worker's columns and order", async () => {
    const carousel = await get(await import("../../app/api/carousel/route"), "/api/carousel");
    expect(Object.keys(carousel.body[0])).toEqual(["id", "image_url", "position"]);
    expect(carousel.body.map((r: { position: number }) => r.position)).toEqual(
      [...carousel.body.map((r: { position: number }) => r.position)].sort((a, b) => a - b),
    );
    const faqs = await get(await import("../../app/api/faqs/route"), "/api/faqs");
    expect(Object.keys(faqs.body[0])).toEqual(["id", "question", "answer", "display_order"]);
    expect(typeof faqs.body[0].id).toBe("number");
    const tacs = await get(await import("../../app/api/tacs/route"), "/api/tacs");
    expect(Object.keys(tacs.body[0])).toEqual(["id", "section", "content", "display_order"]);
  });

  it("TC-PG-03: categories show only active ones publicly, and everything plus service_count to admins", async () => {
    const route = await import("../../app/api/categories/route");
    authMock.mockResolvedValueOnce({ userId: null });
    const pub = await get(route, "/api/categories");
    expect(Object.keys(pub.body[0])).toEqual(["id", "name", "slug", "description", "image", "position"]);
    expect(pub.body.some((c: { slug: string }) => c.slug === "hidden")).toBe(false);

    authMock.mockResolvedValueOnce({ userId: "user_admin" });
    const adm = await get(route, "/api/categories");
    expect(adm.body.some((c: { slug: string }) => c.slug === "hidden")).toBe(true);
    expect(typeof adm.body[0].service_count).toBe("number");
    expect(adm.body[0]).toHaveProperty("is_active");
  });

  it("TC-PG-04: services hide inactive ones publicly and carry category_name and nailist_ids", async () => {
    const route = await import("../../app/api/services/route");
    const pub = await get(route, "/api/services");
    expect(pub.body.some((s: { id: number }) => s.id === 1)).toBe(false);
    const service = pub.body[0];
    expect(service).toHaveProperty("category_name");
    expect(service.nailist_ids === null || /^\d+(,\d+)*$/.test(service.nailist_ids)).toBe(true);
    expect(typeof service.master_price).toBe("number");

    authMock.mockResolvedValueOnce({ userId: "user_admin" });
    const adm = await get(route, "/api/services");
    expect(adm.body.some((s: { id: number }) => s.id === 1)).toBe(true);
  });

  it("TC-PG-05: a single service is 404 when hidden from the public, and gallery is capped at 10", async () => {
    const one = await import("../../app/api/services/[id]/route");
    expect((await get(one, "/api/services/1", { id: "1" })).status).toBe(404);
    const visible = await get(one, "/api/services/2", { id: "2" });
    expect(visible.status).toBe(200);
    expect(visible.body.id).toBe(2);

    const gallery = await get(await import("../../app/api/services/[id]/gallery/route"), "/api/services/2/gallery", { id: "2" });
    expect(gallery.body.length).toBeLessThanOrEqual(10);
    expect(gallery.body.every((g: { service_id: number }) => g.service_id === 2)).toBe(true);
  });

  it("TC-PG-07: out-of-range ids and inherited names don't crash (Worker answers: 404, [], forwarded)", async () => {
    const one = await import("../../app/api/services/[id]/route");
    expect((await get(one, "/api/services/99999999999", { id: "99999999999" })).status).toBe(404);
    const gallery = await import("../../app/api/services/[id]/gallery/route");
    expect((await get(gallery, "/api/services/99999999999/gallery", { id: "99999999999" })).body).toEqual([]);

    const { isContentSection } = await import("../../server/catalog");
    expect(["toString", "constructor", "__proto__", "hasOwnProperty"].some(isContentSection)).toBe(false);
  });

  it("TC-PG-08: content keys match case-insensitively, like SQLite's LIKE", async () => {
    await admin`insert into content (key, value) values ('Home_Extra', 'x')`;
    const route = await import("../../app/api/content/[section]/route");
    const home = await get(route, "/api/content/home", { section: "home" });
    expect(home.body.Home_Extra).toBe("x");
  });

  it("TC-PG-06: nailists include the category name as position, service_ids and offered_services", async () => {
    const res = await get(await import("../../app/api/nailists/route"), "/api/nailists");
    const nailist = res.body[0];
    expect(Object.keys(nailist)).toEqual([
      "id", "name", "category_id", "position", "is_master", "hide_position", "specialty", "bio", "image", "service_ids", "offered_services",
    ]);
    expect(Array.isArray(nailist.service_ids)).toBe(true);
    expect(nailist.service_ids.length).toBe(nailist.offered_services.length);
    expect(nailist.service_ids.every((id: unknown) => typeof id === "number")).toBe(true);
  });
});
