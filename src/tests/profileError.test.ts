import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProfile, isEmailTaken, isMissingProfile, ProfileError, ProfileSaveError, updateProfile } from "../services/userService";

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

  it("keeps the server's message when saving a profile is refused, and spots a taken email (409)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ message: "This email is already used by another account." }) }),
    );
    const err = await updateProfile("user_1", {}, "tok").catch((e) => e);
    expect(err).toBeInstanceOf(ProfileSaveError);
    expect(err.message).toBe("This email is already used by another account.");
    expect(isEmailTaken(err)).toBe(true);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => { throw new Error("no body"); } }));
    const other = await updateProfile("user_1", {}, "tok").catch((e) => e);
    expect(other.message).toBe("Failed to update profile");
    expect(isEmailTaken(other)).toBe(false);
  });
});
