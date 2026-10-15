import { describe, expect, it } from "vitest";
import { pickMainPhoto } from "../features/catalog/lib/mainPhoto";

const photos = ["https://img/a.webp", "https://img/b.webp", "https://img/c.webp"];

describe("pickMainPhoto", () => {
  it("uses the starred photo", () => {
    expect(pickMainPhoto(photos, "https://img/c.webp")).toBe("https://img/c.webp");
  });

  it("falls back to the first photo when nothing is starred", () => {
    expect(pickMainPhoto(photos, null)).toBe("https://img/a.webp");
    expect(pickMainPhoto(photos, undefined)).toBe("https://img/a.webp");
  });

  it("falls back to the first photo when the starred one was removed from the gallery", () => {
    expect(pickMainPhoto(photos, "https://img/gone.webp")).toBe("https://img/a.webp");
  });

  it("has no main photo for an empty gallery", () => {
    expect(pickMainPhoto([], "https://img/a.webp")).toBeNull();
  });
});
