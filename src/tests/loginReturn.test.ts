import { describe, expect, it } from "vitest";
import { safeReturnPath, withReturn } from "@/lib/loginReturn";

describe("where to go back to after logging in", () => {
  it("keeps a page of the site, with its query", () => {
    expect(safeReturnPath("/services/softgel-extensions")).toBe("/services/softgel-extensions");
    expect(safeReturnPath("/artists/max?x=1")).toBe("/artists/max?x=1");
  });

  it("refuses other sites, empty values and the login pages themselves", () => {
    for (const bad of [null, undefined, "", "services", "//evil.com", "https://evil.com", "/\\evil.com", "/login", "/login?x=1", "/signup/verify"]) {
      expect(safeReturnPath(bad)).toBeNull();
    }
  });

  it("adds the page to the login address only when it is safe", () => {
    expect(withReturn("/login", "/services/softgel-extensions")).toBe("/login?return_to=%2Fservices%2Fsoftgel-extensions");
    expect(withReturn("/signup", "//evil.com")).toBe("/signup");
    expect(withReturn("/login", null)).toBe("/login");
  });
});
