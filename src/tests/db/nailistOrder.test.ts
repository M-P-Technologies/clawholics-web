// @vitest-environment node
// Integration tests for the order the admin gives the artists, against a throwaway Postgres
// (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, callRoute, resetTestDatabase } from "./testDatabase";

const authMock = vi.fn(async () => ({ userId: null as string | null }));
vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock(), clerkClient: async () => ({}) }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: () => {} }));

const as = (clerkId: string | null) => authMock.mockResolvedValue({ userId: clerkId });

describe.skipIf(!TEST_DATABASE_URL)("the artists' order (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let handlers: typeof import("../../server/handlers/nailists");
  let list: typeof import("../../app/api/nailists/route");

  const order = async () => (await callRoute(list.GET, "/api/nailists")).body.map((n: { id: number }) => n.id);

  beforeAll(async () => {
    db = await resetTestDatabase();
    await db`insert into users (clerk_id, email, role) values ('user_admin', 'admin@x.test', 'admin'), ('user_a', 'a@x.test', 'customer')`;
    handlers = await import("../../server/handlers/nailists");
    list = await import("../../app/api/nailists/route");
  });

  afterAll(async () => {
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("the artists follow the order the admin saved, and a new artist goes last", async () => {
    const before: number[] = await order();
    expect(before.length).toBeGreaterThan(1);

    as("user_admin");
    const reversed = [...before].reverse();
    const saved = await callRoute(handlers.reorderNailists, "/api/nailists/reorder", { method: "PUT", body: { ids: reversed } });
    expect(saved.status).toBe(200);
    expect(await order()).toEqual(reversed);

    const created = await callRoute(handlers.createNailist, "/api/nailists", { method: "POST", body: { name: "Newest", position: "Junior" } });
    expect(created.status).toBe(201);
    expect(await order()).toEqual([...reversed, created.body.id]);
  });

  it("only an admin reorders, and the list must be real artists' ids without repeats", async () => {
    const ids: number[] = await order();
    as(null);
    expect((await callRoute(handlers.reorderNailists, "/api/nailists/reorder", { method: "PUT", body: { ids } })).status).toBe(401);
    as("user_a");
    expect((await callRoute(handlers.reorderNailists, "/api/nailists/reorder", { method: "PUT", body: { ids } })).status).toBe(403);
    as("user_admin");
    for (const bad of [[], [ids[0], ids[0]], ["x"], "nope"]) {
      expect((await callRoute(handlers.reorderNailists, "/api/nailists/reorder", { method: "PUT", body: { ids: bad } })).status).toBe(400);
    }
    expect(await order()).toEqual(ids);
  });
});
