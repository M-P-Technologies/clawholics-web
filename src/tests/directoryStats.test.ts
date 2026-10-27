import { describe, expect, it } from "vitest";
import { countIdle, countUniqueClients, countWithin, uniqueClients } from "@/lib/directoryStats";
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

describe("countUniqueClients", () => {
  it("counts each person once, by email, and leaves out the walk-in guest", () => {
    const withEmail = (id: string, email?: string): DirectoryUser => ({ ...user(id), email });
    expect(countUniqueClients([
      withEmail("a", "ana@x.test"),
      withEmail("manual_1", " Ana@X.test "), // the same person, added by hand before she signed up
      withEmail("b", "bea@x.test"),
      withEmail("walkin_guest", "walkin-guest@clawholics.local"),
      withEmail("c"), // no email: counts on its own
      withEmail("d"),
    ])).toBe(4);
  });
});

describe("the time-window counts count each person once", () => {
  it("a person with two accounts counts once, and the walk-in guest never", () => {
    const people: DirectoryUser[] = [
      { ...user("a"), email: "ana@x.test" },
      { ...user("manual_1"), email: "ana@x.test" },
      { ...user("walkin_guest"), email: "walkin-guest@clawholics.local" },
    ];
    const recent = { imageUrl: null, joinedAt: "2026-10-10T00:00:00Z", lastSignInAt: "2026-10-11T00:00:00Z" };
    const both = { a: recent, manual_1: recent, walkin_guest: recent };
    expect(countWithin(people, both, "joinedAt", 30, now)).toBe(1);
    expect(countWithin(people, both, "lastSignInAt", 30, now)).toBe(1);
    expect(countIdle(people, both, 30, now)).toBe(0);
  });
});

describe("uniqueClients", () => {
  it("keeps each person's first account, in order, without the walk-in guest", () => {
    const people: DirectoryUser[] = [
      { ...user("b"), email: "bea@x.test" },
      { ...user("walkin_guest"), email: "walkin-guest@clawholics.local" },
      { ...user("a"), email: "ana@x.test" },
      { ...user("manual_1"), email: "ANA@x.test" },
    ];
    expect(uniqueClients(people).map((u) => u.id)).toEqual(["b", "a"]);
  });
});
