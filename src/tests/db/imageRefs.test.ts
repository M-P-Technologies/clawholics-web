// @vitest-environment node
// Integration tests for deleting a photo's file only once nothing shows it, against a throwaway
// Postgres (`npm run test:db`).
import type postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_DATABASE_URL, resetTestDatabase } from "./testDatabase";

const deleteObject = vi.fn(async (_key: string) => {});
vi.mock("../../server/r2", () => ({
  deleteObject: (key: string) => deleteObject(key),
  publicBaseUrl: () => "https://images.test",
}));

const url = (key: string) => `https://images.test/${key}`;

describe.skipIf(!TEST_DATABASE_URL)("releasing images (Postgres)", () => {
  let db: ReturnType<typeof postgres>;
  let refs: typeof import("../../server/imageRefs");
  let nailist: number;

  beforeAll(async () => {
    db = await resetTestDatabase();
    refs = await import("../../server/imageRefs");
    [{ id: nailist }] = await db<{ id: number }[]>`insert into nailists (name, category_id) values ('Maxine', 1) returning id`;
  });

  beforeEach(async () => {
    deleteObject.mockClear();
    await db`delete from nailist_gallery`;
    await db`delete from home_carousel`;
    await db`delete from service_gallery`;
    await db`delete from content`;
    await db`delete from services`;
  });

  afterAll(async () => {
    await db?.end();
    const { getSql } = await import("../../server/db");
    await getSql().end();
  });

  it("deletes a file nothing refers to", async () => {
    await refs.releaseImages([url("nailists/1-aa-visit.webp")]);
    expect(deleteObject).toHaveBeenCalledExactlyOnceWith("nailists/1-aa-visit.webp");
  });

  it("keeps a file another table still shows, then deletes it once the last one lets go", async () => {
    const photo = url("nailists/2-bb-visit.webp");
    await db`insert into nailist_gallery (nailist_id, image_url, position) values (${nailist}, ${photo}, 1)`;
    // The same photo is also in the carousel
    await db`insert into home_carousel (image_url, position) values (${photo}, 1)`;

    await refs.releaseImages([photo]);
    expect(deleteObject).not.toHaveBeenCalled();

    await db`delete from nailist_gallery`;
    await refs.releaseImages([photo]);
    expect(deleteObject).not.toHaveBeenCalled(); // the carousel still shows it

    await db`delete from home_carousel`;
    await refs.releaseImages([photo]);
    expect(deleteObject).toHaveBeenCalledExactlyOnceWith("nailists/2-bb-visit.webp");
  });

  it("keeps a file mentioned inside a content value (JSON or HTML)", async () => {
    await db`insert into content (key, value) values ('home_strip', ${JSON.stringify([{ image: url("services/3-cc-strip.webp") }])})`;
    await db`insert into content (key, value) values ('about_html', ${`<img src="${url("content/4-dd-about.webp")}">`})`;
    await refs.releaseImages([url("services/3-cc-strip.webp"), url("content/4-dd-about.webp")]);
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("keeps a file stored under another host in an older row", async () => {
    await db`insert into services (name, image, master_price, junior_price, pricing_mode)
      values ('Gel', 'https://old-worker.example.dev/images/services/5-ee-gel.webp', 800, 500, 'tiered')`;
    await refs.releaseImages([url("services/5-ee-gel.webp")]);
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("ignores addresses that aren't in our bucket, and files that aren't images", async () => {
    await refs.releaseImages([
      "https://elsewhere.example/services/6-ff.webp",
      url("backups/dump.sql"),
      null,
      undefined,
      "",
    ]);
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("releases each file once, and carries on when one delete fails", async () => {
    deleteObject.mockRejectedValueOnce(new Error("R2 unavailable"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await refs.releaseImages([url("a/7-aa.webp"), url("a/7-aa.webp"), url("a/8-bb.webp")]);
    expect(deleteObject.mock.calls.map(([key]) => key)).toEqual(["a/7-aa.webp", "a/8-bb.webp"]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
