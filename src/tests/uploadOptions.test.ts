import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("browser-image-compression", () => ({ default: vi.fn() }));

import imageCompression from "browser-image-compression";
import { uploadImage } from "../services/uploadService";

const png = () => new File([new Uint8Array(10)], "shot.png", { type: "image/png" });
const blobOfKB = (kb: number) =>
  new Blob([new Uint8Array(kb * 1024)], { type: "image/webp" }) as unknown as File;

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ key: "k", imageUrl: "https://img/k.webp" }),
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("uploadImage compression options", () => {
  it("keeps the 1000px / 130KB defaults for every other upload", async () => {
    vi.mocked(imageCompression).mockResolvedValue(blobOfKB(50));
    await uploadImage(png());
    expect(imageCompression).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxWidthOrHeight: 1000, maxSizeMB: 130 / 1024 }),
    );
  });

  it("still rejects a 200KB result with the defaults", async () => {
    vi.mocked(imageCompression).mockResolvedValue(blobOfKB(200));
    await expect(uploadImage(png())).rejects.toThrow("Compressed image is still larger than 130KB");
  });

  it("accepts 200KB when the caller allows 400KB at 1600px", async () => {
    vi.mocked(imageCompression).mockResolvedValue(blobOfKB(200));
    await expect(
      uploadImage(png(), "uploads", "tok", "user_1", { maxWidthOrHeight: 1600, maxSizeKB: 400 }),
    ).resolves.toEqual({ key: "k", imageUrl: "https://img/k.webp" });
    expect(imageCompression).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxWidthOrHeight: 1600, maxSizeMB: 400 / 1024 }),
    );
  });
});

describe("PHOTO_UPLOAD_OPTIONS", () => {
  it("keeps 1600px and up to 400KB for photos shown large, within the server's 500KB limit", async () => {
    const { PHOTO_UPLOAD_OPTIONS } = await import("../services/uploadService");
    expect(PHOTO_UPLOAD_OPTIONS).toEqual({ maxWidthOrHeight: 1600, maxSizeKB: 400 });

    vi.mocked(imageCompression).mockResolvedValue(blobOfKB(300));
    await uploadImage(png(), "carousel", null, null, PHOTO_UPLOAD_OPTIONS);
    expect(imageCompression).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxWidthOrHeight: 1600, maxSizeMB: 400 / 1024 }),
    );
  });
});
