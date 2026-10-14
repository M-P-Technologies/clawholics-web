import { describe, expect, it } from "vitest";
import { countIdle, countWithin } from "@/lib/directoryStats";
import type { DirectoryUser } from "@/components/features/admin/directory/DirectoryProfileCard";

const now = Date.parse("2026-10-12T00:00:00Z");
const user = (id: string): DirectoryUser => ({ id, clerk_id: id, firstName: id, lastName: "", phoneNumber: "" });
const users = ["a", "b", "c", "d"].map(user);
const profiles = {
  a: { imageUrl: null, joinedAt: "2026-10-01T00:00:00Z", lastSignInAt: "2026-10-11T00:00:00Z" },
  b: { imageUrl: null, joinedAt: "2026-01-01T00:00:00Z", lastSignInAt: "2026-08-01T00:00:00Z" },
  c: { imageUrl: null, joinedAt: "2026-09-13T00:00:00Z", lastSignInAt: null },
  // d has no Clerk profile (added by hand)
};

describe("directory stats", () => {
  it("counts the people whose date falls within the last days, the edge day included", () => {
    expect(countWithin(users, profiles, "joinedAt", 30, now)).toBe(2);
    expect(countWithin(users, profiles, "lastSignInAt", 7, now)).toBe(1);
  });

  it("counts as idle anyone not signed in for that long, or never", () => {
    expect(countIdle(users, profiles, 30, now)).toBe(3);
  });
});
