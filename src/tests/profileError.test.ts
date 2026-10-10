import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProfile, isMissingProfile, ProfileError } from "../services/userService";

describe("fetchProfile errors", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("throws a ProfileError carrying the status, and only a 404 counts as a missing profile", async () => {
    for (const [status, missing] of [[404, true], [401, false], [500, false]] as const) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
      const err = await fetchProfile("user_1", "tok").catch((e) => e);
      expect(err).toBeInstanceOf(ProfileError);
      expect((err as ProfileError).status).toBe(status);
      expect(isMissingProfile(err)).toBe(missing);
    }
  });

  it("does not treat a network failure as a missing profile", () => {
    expect(isMissingProfile(new TypeError("Failed to fetch"))).toBe(false);
  });
});
