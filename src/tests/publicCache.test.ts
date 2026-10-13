// @vitest-environment node
import { revalidateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG_TAG, changesCatalog } from "@/server/publicCache";

const isAdmin = vi.fn();
vi.mock("@/server/auth", () => ({ isAdmin: () => isAdmin() }));
const getServices = vi.fn();
vi.mock("@/server/catalog", () => ({
  getServices: (admin: boolean) => getServices(admin),
  getCategories: vi.fn(),
  getContent: vi.fn(),
  getCarousel: vi.fn(),
  getFaqs: vi.fn(),
  getTacs: vi.fn(),
  getService: vi.fn(),
  getServiceGallery: vi.fn(),
  getNailists: vi.fn(),
  getNailist: vi.fn(),
  getNailistGallery: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("API_BACKEND", "next");
});
afterEach(() => vi.unstubAllEnvs());

describe("changesCatalog", () => {
  it("drops the cached public reads once a write succeeds", async () => {
    const write = changesCatalog(async () => Response.json({ message: "ok" }));
    await write(new Request("http://x/api/faqs", { method: "POST" }), {});
    expect(revalidateTag).toHaveBeenCalledWith(CATALOG_TAG, { expire: 0 });
  });

  it("keeps them when the write is refused or fails", async () => {
    for (const status of [400, 403, 404, 500]) {
      const write = changesCatalog(async () => Response.json({ error: "no" }, { status }));
      await write(new Request("http://x/api/faqs", { method: "POST" }), {});
    }
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("GET /services", () => {
  const get = async () => {
    const route = await import("@/app/api/services/route");
    const res = await route.GET(new Request("http://x/api/services", { headers: { "x-clawholics-origin": "frontend" } }), {} as never);
    return res.json();
  };

  it("gives visitors the public list", async () => {
    isAdmin.mockResolvedValue(false);
    getServices.mockResolvedValue([{ id: 1 }]);
    expect(await get()).toEqual([{ id: 1 }]);
    expect(getServices).toHaveBeenCalledWith(false);
  });

  it("gives admins every service, hidden ones included", async () => {
    isAdmin.mockResolvedValue(true);
    getServices.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    expect(await get()).toEqual([{ id: 1 }, { id: 2 }]);
    expect(getServices).toHaveBeenCalledWith(true);
  });
});
