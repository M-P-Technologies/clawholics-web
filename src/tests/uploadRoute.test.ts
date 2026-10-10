// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requireUser = vi.fn();
const requireAdmin = vi.fn();
vi.mock("../server/auth", () => ({ requireUser: () => requireUser(), requireAdmin: () => requireAdmin() }));

const putObject = vi.fn();
const deleteObject = vi.fn();
vi.mock("../server/r2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../server/r2")>()),
  putObject: (...args: unknown[]) => putObject(...args),
  deleteObject: (...args: unknown[]) => deleteObject(...args),
}));

const { POST, DELETE } = await import("../app/api/upload/image/route");

const ORIGIN = { "x-clawholics-origin": "frontend" };

const upload = (file: File | null, folder = "nailists") => {
  const form = new FormData();
  if (file) form.set("file", file);
  form.set("folder", folder);
  return POST(new Request("http://localhost/api/upload/image", { method: "POST", body: form, headers: ORIGIN }), {});
};

const webp = (name = "My Photo.webp", size = 1000) => new File([new Uint8Array(size)], name, { type: "image/webp" });

beforeEach(() => {
  vi.stubEnv("API_BACKEND", "next");
  vi.stubEnv("R2_PUBLIC_URL", "https://images.example.com/");
  requireUser.mockResolvedValue({ clerkId: "user_1", role: "customer" });
  requireAdmin.mockResolvedValue({ clerkId: "user_a", role: "admin" });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /upload/image", () => {
  it("TC-UP-01: stores a webp under the Worker's key format and returns its public URL", async () => {
    const res = await upload(webp());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.message).toBe("Image uploaded successfully");
    expect(body.key).toMatch(/^nailists\/\d+-[0-9a-f-]{36}-my-photo\.webp$/);
    expect(body.imageUrl).toBe(`https://images.example.com/${body.key}`);
    expect(putObject).toHaveBeenCalledWith(body.key, expect.any(Uint8Array), "image/webp");
  });

  it("TC-UP-02: requires a signed-in user", async () => {
    requireUser.mockResolvedValue(Response.json({ error: "Authentication required." }, { status: 401 }));
    expect((await upload(webp())).status).toBe(401);
    expect(putObject).not.toHaveBeenCalled();
  });

  it.each([
    ["no file", null, "No image file provided"],
    ["a non-image type", new File(["x"], "a.gif", { type: "image/gif" }), "Invalid image type. Only JPG, PNG, and WEBP are allowed."],
    ["a file over 500KB", webp("big.webp", 500 * 1024 + 1), "Image must be 500KB or smaller after compression."],
    ["a jpeg", new File(["x"], "a.jpg", { type: "image/jpeg" }), "Image must be converted to WEBP before upload."],
  ])("TC-UP-03: rejects %s with the Worker's message", async (_label, file, message) => {
    const res = await upload(file);
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe(message);
    expect(putObject).not.toHaveBeenCalled();
  });

  it("TC-UP-04: strips path characters from the folder", async () => {
    const body = await (await upload(webp(), "../Etc Passwd")).json();
    expect(body.key.startsWith("/etc-passwd/") || body.key.startsWith("etc-passwd/")).toBe(true);
    expect(body.key).not.toContain("..");
  });
});

describe("DELETE /upload/image", () => {
  const del = (body: unknown) =>
    DELETE(new Request("http://localhost/api/upload/image", { method: "DELETE", body: JSON.stringify(body), headers: ORIGIN }), {});

  it("TC-UP-05: requires an admin", async () => {
    requireAdmin.mockResolvedValue(Response.json({ error: "Forbidden" }, { status: 403 }));
    expect((await del({ key: "nailists/a.webp" })).status).toBe(403);
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("TC-UP-06: deletes by key, or by a public URL on R2_PUBLIC_URL", async () => {
    expect(await (await del({ key: "nailists/a.webp" })).json()).toEqual({ message: "Image deleted successfully", key: "nailists/a.webp" });
    await del({ imageUrl: "https://images.example.com/content/b.webp" });
    expect(deleteObject.mock.calls).toEqual([["nailists/a.webp"], ["content/b.webp"]]);
  });

  it("TC-UP-07: refuses URLs outside the bucket's public URL", async () => {
    const res = await del({ imageUrl: "https://evil.example.com/content/b.webp" });
    expect(res.status).toBe(400);
    expect(deleteObject).not.toHaveBeenCalled();
  });
});
