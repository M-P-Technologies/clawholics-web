// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireAdmin = vi.fn();
vi.mock("../server/auth", () => ({ requireAdmin: () => requireAdmin() }));

// A stand-in for the postgres.js tag: each call answers with the next queued result
const results: unknown[] = [];
const sql = vi.fn(async () => results.shift());
vi.mock("../server/db", () => ({ getSql: () => sql }));

const { GET, POST } = await import("../app/api/nailists/[id]/gallery/route");
const { DELETE } = await import("../app/api/nailist-gallery/[id]/route");

const ORIGIN = { "x-clawholics-origin": "frontend" };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (id: string, body: unknown) =>
  POST(new Request(`http://localhost/api/nailists/${id}/gallery`, { method: "POST", body: JSON.stringify(body), headers: ORIGIN }), ctx(id));

beforeEach(() => {
  vi.stubEnv("API_BACKEND", "next");
  requireAdmin.mockResolvedValue({ clerkId: "user_a", role: "admin" });
  results.length = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("artist gallery routes", () => {
  it("GET lists an artist's photos without needing a login", async () => {
    results.push([{ id: 1, nailist_id: 7, image_url: "https://img/a.webp", position: 1 }]);
    const res = await GET(new Request("http://localhost/api/nailists/7/gallery", { headers: ORIGIN }), ctx("7"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1, nailist_id: 7, image_url: "https://img/a.webp", position: 1 }]);
    expect(requireAdmin).not.toHaveBeenCalled();
  });

  it("GET answers an empty list for an id that isn't a number", async () => {
    const res = await GET(new Request("http://localhost/api/nailists/abc/gallery", { headers: ORIGIN }), ctx("abc"));
    expect(await res.json()).toEqual([]);
    expect(sql).not.toHaveBeenCalled();
  });

  it("POST is for admins only", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Forbidden" }, { status: 403 }));
    const res = await post("7", { image_url: "https://img/a.webp" });
    expect(res.status).toBe(403);
    expect(sql).not.toHaveBeenCalled();
  });

  it("POST needs an image_url", async () => {
    const res = await post("7", {});
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("image_url is required.");
  });

  it("POST answers 404 for an artist that doesn't exist", async () => {
    results.push([]); // no such nailist
    const res = await post("99", { image_url: "https://img/a.webp" });
    expect(res.status).toBe(404);
  });

  it("POST refuses an 11th photo", async () => {
    results.push([{ "?column?": 1 }], [{ count: 10 }]);
    const res = await post("7", { image_url: "https://img/k.webp" });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe("An artist can only have up to 10 photos.");
  });

  it("POST adds a photo at the next position", async () => {
    results.push([{ "?column?": 1 }], [{ count: 2 }], [{ id: 31 }]);
    const res = await post("7", { image_url: "https://img/c.webp" });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 31 });
    const insert = sql.mock.calls.at(-1) as unknown as unknown[];
    expect(insert.slice(1)).toEqual([7, "https://img/c.webp", 3]);
  });

  it("DELETE is for admins only, and removes the photo", async () => {
    requireAdmin.mockResolvedValueOnce(Response.json({ error: "Forbidden" }, { status: 403 }));
    expect((await DELETE(new Request("http://localhost/api/nailist-gallery/5", { method: "DELETE", headers: ORIGIN }), ctx("5"))).status).toBe(403);
    expect(sql).not.toHaveBeenCalled();

    results.push([]);
    const res = await DELETE(new Request("http://localhost/api/nailist-gallery/5", { method: "DELETE", headers: ORIGIN }), ctx("5"));
    expect(res.status).toBe(200);
    expect((sql.mock.calls.at(-1) as unknown as unknown[]).slice(1)).toEqual([5]);
  });
});
