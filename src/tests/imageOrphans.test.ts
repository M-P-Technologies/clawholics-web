// @vitest-environment node
import { describe, expect, it } from "vitest";
import { findOrphans, referencedFileNames, type StoredObject } from "../lib/imageSources";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-11-10T00:00:00Z");
const stored = (key: string, daysOld: number, size = 1000): StoredObject => ({ key, size, lastModified: new Date(NOW - daysOld * DAY) });

describe("finding unused images", () => {
  const referenced = referencedFileNames([
    "https://images.clawholicsbymax.com/services/1730000000-aaa-gel.webp",
    // The old Worker's host, and JSON and HTML text holding more of them
    "https://clawholics-api-staging.clawholicsdev.workers.dev/images/nailists/1720000000-bbb-ana.webp",
    '[{"image":"https://i.test/content/1740000000-ccc-strip.WEBP"}]',
    '<p><img src="https://i.test/content/1750000000-ddd-about.jpg"></p>',
    null,
    undefined,
  ]);

  it("keeps every image a column mentions, whatever the host or the letter case", () => {
    const objects = [
      stored("services/1730000000-aaa-gel.webp", 30),
      stored("nailists/1720000000-bbb-ana.webp", 30),
      stored("content/1740000000-ccc-strip.webp", 30),
      stored("content/1750000000-ddd-about.jpg", 30),
    ];
    expect(findOrphans(objects, referenced, 3 * DAY, NOW)).toEqual([]);
  });

  it("lists images nothing mentions", () => {
    const objects = [stored("services/1730000000-aaa-gel.webp", 30), stored("reviews/3f2a.webp", 30), stored("nailists/old.png", 90)];
    expect(findOrphans(objects, referenced, 3 * DAY, NOW).map((o) => o.key)).toEqual(["reviews/3f2a.webp", "nailists/old.png"]);
  });

  it("leaves recent files alone, since an upload is only mentioned once its form is saved", () => {
    const objects = [stored("content/new.webp", 1), stored("content/older.webp", 5)];
    expect(findOrphans(objects, referenced, 3 * DAY, NOW).map((o) => o.key)).toEqual(["content/older.webp"]);
  });

  it("never lists a file that isn't an image", () => {
    const objects = [stored("backups/db.sql", 400), stored("docs/menu.pdf", 400), stored("robots.txt", 400)];
    expect(findOrphans(objects, referenced, 3 * DAY, NOW)).toEqual([]);
  });
});
