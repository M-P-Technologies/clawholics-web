// @vitest-environment node
// Integration tests for clients' reviews against a throwaway Postgres (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  clerkClient: async () => ({ users: { getUser: vi.fn(async () => null) } }),
}));
vi.mock("next/server", () => ({ after: () => {} }));
// A real WEBP signature: uploads check the first bytes, not just the type
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, ...new Array(88).fill(0)]);
const putObject = vi.fn(async (..._args: unknown[]) => {});
vi.mock("../../server/r2", () => ({ putObject: (...args: unknown[]) => putObject(...args), publicBaseUrl: () => "https://images.test" }));

const as = (clerkId: string | null) => authMock.mockResolvedValue({ userId: clerkId });

describe.skipIf(!TEST_DATABASE_URL)("reviews (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let reviews: typeof import("../../server/handlers/reviews");
  let clients: typeof import("../../server/handlers/clients");
  const ids: Record<string, number> = {};

  const form = (appointmentId: number, rating: number | string, comment = "", photoType?: string) => {
    const body = new FormData();
    body.set("appointment_id", String(appointmentId));
    body.set("rating", String(rating));
    body.set("comment", comment);
    if (photoType) body.set("file", new File([WEBP], "nails.webp", { type: photoType }));
    return body;
  };
  const post = (body: FormData) => callRoute(reviews.createReview, "/api/reviews", { method: "POST", body });

  beforeAll(async () => {
    db = await resetTestDatabase();
    await db`truncate users, scan_history restart identity cascade`;
    const user = async (clerkId: string, role: string) =>
      (await db<{ id: number }[]>`insert into users (clerk_id, email, role) values (${clerkId}, ${`${clerkId}@x.test`}, ${role}) returning id`)[0].id;
    const [admin, ana, bea] = [await user("user_admin", "admin"), await user("user_ana", "customer"), await user("user_bea", "customer")];
    const [gel] = await db<{ id: number }[]>`insert into services (name, master_price, junior_price, pricing_mode) values ('Gel', 800, 500, 'tiered') returning id`;
    const [maxine] = await db<{ id: number }[]>`insert into nailists (name, category_id) values ('Maxine', 1) returning id`;
    const appt = async (userId: number, date: string, status: string) =>
      (await db<{ id: number }[]>`
        insert into appointments (user_id, service_id, service_name, nailist_id, nailist_name, appointment_date, appointment_time, status)
        values (${userId}, ${gel.id}, 'Gel', ${maxine.id}, 'Maxine', ${date}, '10:00-11:00', ${status}) returning id`)[0].id;
    Object.assign(ids, {
      admin, ana, bea,
      done: await appt(ana, "2026-09-05", "COMPLETED"),
      done2: await appt(ana, "2026-08-01", "completed"),
      ahead: await appt(ana, "2026-11-02", "CONFIRMED"),
      beas: await appt(bea, "2026-10-01", "COMPLETED"),
    });
    reviews = await import("../../server/handlers/reviews");
    clients = await import("../../server/handlers/clients");
  });

  afterAll(async () => {
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("need a signed-in client", async () => {
    as(null);
    expect((await post(form(ids.done, 5))).status).toBe(401);
    expect((await callRoute(reviews.listMyReviews, "/api/reviews")).status).toBe(401);
  });

  it("are only for the client's own completed visits, with 1 to 5 stars", async () => {
    as("user_ana");
    expect((await post(form(ids.done, 0))).status).toBe(400);
    expect((await post(form(ids.done, 6))).status).toBe(400);
    expect((await post(form(ids.done, "4.5"))).status).toBe(400);
    expect((await post(form(ids.done, 5, "x".repeat(1001)))).status).toBe(400);
    expect((await post(form(ids.done, 5, "", "image/gif"))).status).toBe(400);
    expect((await post(form(999999, 5))).status).toBe(404);
    expect((await post(form(ids.beas, 5))).status).toBe(403);
    expect((await post(form(ids.ahead, 5))).status).toBe(400); // not completed yet
    expect((await db`select 1 from reviews`).length).toBe(0);
  });

  it("save the stars, words and photo once per visit", async () => {
    as("user_ana");
    const saved = await post(form(ids.done, 5, "  Best set yet  ", "image/webp"));
    expect(saved.status).toBe(201);
    expect(saved.body).toMatchObject({ appointment_id: ids.done, rating: 5, comment: "Best set yet" });
    expect(saved.body.photo_url).toMatch(/^https:\/\/images\.test\/reviews\/[0-9a-f-]{36}\.webp$/);
    expect(putObject).toHaveBeenCalledTimes(1);
    expect((await post(form(ids.done, 3))).status).toBe(409);

    // No words or photo is fine; the status check ignores case
    const plain = await post(form(ids.done2, 4));
    expect(plain.status).toBe(201);
    expect(plain.body).toMatchObject({ rating: 4, comment: "", photo_url: null });
  });

  it("list a client's own reviews only", async () => {
    as("user_ana");
    const mine = await callRoute(reviews.listMyReviews, "/api/reviews");
    expect((mine.body as { appointment_id: number }[]).map((r) => r.appointment_id).sort()).toEqual([ids.done, ids.done2].sort());
    as("user_bea");
    expect((await callRoute(reviews.listMyReviews, "/api/reviews")).body).toEqual([]);
  });

  it("reach the home page only once an admin approves them", async () => {
    const publicList = async () => (await callRoute(reviews.listPublicReviews, "/api/reviews/public")).body as { id: number; client_name: string | null; service_name: string }[];
    const [{ id }] = await db<{ id: number }[]>`select id from reviews where appointment_id = ${ids.done}`;
    const approve = (reviewId: number, approved: unknown) =>
      callRoute(reviews.setReviewApproval, `/api/reviews/${reviewId}/approval`, { method: "PUT", body: { approved }, params: { id: String(reviewId) } });

    as(null);
    expect(await publicList()).toEqual([]);
    expect((await approve(id, true)).status).toBe(401);
    as("user_ana"); // the client can't approve their own review
    expect((await approve(id, true)).status).toBe(403);

    as("user_admin");
    expect((await approve(id, "yes")).status).toBe(400);
    expect((await approve(999999, true)).status).toBe(404);
    expect((await approve(id, true)).body).toMatchObject({ id, approved: 1 });

    as(null); // anyone can read the approved ones, and only those
    const shown = await publicList();
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({ id, service_name: "Gel", rating: 5, comment: "Best set yet" });
    expect(shown[0]).not.toHaveProperty("user_id");

    as("user_admin");
    expect((await approve(id, false)).body).toMatchObject({ id, approved: 0 });
    as(null);
    expect(await publicList()).toEqual([]);
  });

  it("show on the admin's client page, next to each appointment", async () => {
    as("user_admin");
    const { body } = await callRoute(clients.getClient, `/api/clients/${ids.ana}`, { params: { id: String(ids.ana) } });
    const byId = Object.fromEntries((body as { appointments: { id: number }[] }).appointments.map((a) => [a.id, a]));
    expect(byId[ids.done]).toMatchObject({ review_rating: 5, review_comment: "Best set yet", review_approved: 0 });
    expect(typeof (byId[ids.done] as { review_id?: number }).review_id).toBe("number");
    expect(byId[ids.ahead]).toMatchObject({ review_rating: null, review_comment: null, review_photo_url: null });
  });
});
