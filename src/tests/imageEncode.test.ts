// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { imageFileName, IMAGE_FILE } from "../lib/imageSources";

vi.mock("server-only", () => ({}));
const { toWebp } = await import("../server/imageEncode");

// A noisy photo-like image, so its size means something
const photo = async (width: number, height: number, format: "jpeg" | "png") => {
  const raw = Buffer.alloc(width * height * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 7919 + (i >> 3) * 31) % 256;
  const image = sharp(raw, { raw: { width, height, channels: 3 } });
  return new Uint8Array(await (format === "jpeg" ? image.jpeg({ quality: 95 }) : image.png()).toBuffer());
};

describe("toWebp", () => {
  it("makes a WEBP no bigger than 1600px on its long side, smaller than the original", async () => {
    const original = await photo(3000, 2000, "jpeg");
    const out = await toWebp(original);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width!, meta.height!)).toBe(1600);
    expect(meta.width! / meta.height!).toBeCloseTo(1.5, 1);
    expect(out.byteLength).toBeLessThan(original.byteLength);
  });

  it("never enlarges a small image", async () => {
    const meta = await sharp(await toWebp(await photo(400, 300, "png"))).metadata();
    expect([meta.width, meta.height]).toEqual([400, 300]);
  });

  it("turns a photo upright by its camera rotation, then drops the metadata", async () => {
    const sideways = new Uint8Array(await sharp(Buffer.alloc(400 * 200 * 3, 120), { raw: { width: 400, height: 200, channels: 3 } }).jpeg().withMetadata({ orientation: 6 }).toBuffer());
    // The input really carries the rotation, so the next lines test the encoder, not the fixture
    expect((await sharp(sideways).metadata()).orientation).toBe(6);
    const meta = await sharp(await toWebp(sideways)).metadata();
    // Orientation 6 is a quarter turn: 400x200 shows as 200x400
    expect([meta.width, meta.height]).toEqual([200, 400]);
    expect(meta.exif).toBeUndefined();
  });

  it("rejects bytes that aren't an image", async () => {
    await expect(toWebp(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0]))).rejects.toThrow();
  });
});

describe("image file names", () => {
  it("names the file of an address or key, whichever host it is on", () => {
    expect(imageFileName("https://images.clawholicsbymax.com/nailists/1730000000-ab12-visit-5-1.webp")).toBe("1730000000-ab12-visit-5-1.webp");
    expect(imageFileName("https://clawholics-api-staging.clawholicsdev.workers.dev/images/uploads/x.webp?v=2")).toBe("x.webp");
    expect(imageFileName("reviews/3f2a.webp")).toBe("3f2a.webp");
  });

  it("finds the image files inside JSON and HTML text", () => {
    const text = '{"slides":[{"image":"https://i.test/services/1-aa-gel.webp"}]} <img src="https://i.test/content/2-bb-about.JPG">';
    expect(text.match(IMAGE_FILE)).toEqual(["1-aa-gel.webp", "2-bb-about.JPG"]);
  });
});
