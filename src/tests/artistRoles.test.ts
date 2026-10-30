import { describe, expect, it } from "vitest";
import { isMasterArtist, publicPosition } from "@/lib/artistRoles";

describe("isMasterArtist", () => {
  it("follows the role's flag, so a new role can charge either price", () => {
    expect(isMasterArtist({ is_master: 1, category_id: 3 })).toBe(true);
    expect(isMasterArtist({ is_master: 0, category_id: 1 })).toBe(false);
  });

  it("falls back to the original Master Technician when the flag is missing", () => {
    expect(isMasterArtist({ category_id: 1 })).toBe(true);
    expect(isMasterArtist({ category_id: 2 })).toBe(false);
    expect(isMasterArtist(null)).toBe(false);
  });
});

describe("publicPosition", () => {
  it("shows the role, or nothing when the artist hides it", () => {
    expect(publicPosition({ position: "Senior Technician", hide_position: 0 })).toBe("Senior Technician");
    expect(publicPosition({ position: "Senior Technician", hide_position: 1 })).toBe("");
    expect(publicPosition({})).toBe("");
  });
});
