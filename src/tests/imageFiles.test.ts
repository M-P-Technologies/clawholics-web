import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { imageBytes, isImageOfType } from "@/server/imageFiles";

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56];
const bytes = (list: number[]) => new Uint8Array(list);

describe("image upload signatures", () => {
  it("accepts real JPG, PNG and WEBP bytes for their own type", () => {
    expect(isImageOfType(bytes(JPEG), "image/jpeg")).toBe(true);
    expect(isImageOfType(bytes(PNG), "image/png")).toBe(true);
    expect(isImageOfType(bytes(WEBP), "image/webp")).toBe(true);
  });

  it("refuses bytes that don't match the claimed type, other types, and short files", () => {
    expect(isImageOfType(bytes(PNG), "image/jpeg")).toBe(false);
    expect(isImageOfType(new TextEncoder().encode("<html><script>alert(1)</script>"), "image/png")).toBe(false);
    expect(isImageOfType(new TextEncoder().encode("<svg onload=alert(1)>"), "image/svg+xml")).toBe(false);
    expect(isImageOfType(bytes([0x52, 0x49, 0x46, 0x46]), "image/webp")).toBe(false);
  });

  it("gives back the bytes of a real image, and null for a disguised file", async () => {
    const real = new File([bytes(WEBP)], "photo.webp", { type: "image/webp" });
    const fake = new File(["<script>alert(1)</script>"], "photo.webp", { type: "image/webp" });
    expect(await imageBytes(real)).toEqual(bytes(WEBP));
    expect(await imageBytes(fake)).toBeNull();
  });
});
