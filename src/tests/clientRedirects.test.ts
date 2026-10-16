// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("the client app's old addresses", () => {
  it("send the profile and booking pages into /my, keeping the query", async () => {
    const redirects = await nextConfig.redirects!();
    const to = (source: string) => redirects.find((r) => r.source === source);
    expect(to("/profile")?.destination).toBe("/my/profile");
    expect(to("/booking")?.destination).toBe("/my/book");
    expect(to("/payment")?.destination).toBe("/my/payment");
    expect(to("/payment-confirmation")?.destination).toBe("/my/confirmation");
    expect(to("/reschedule")?.destination).toBe("/my/reschedule");
    // Next keeps the query string on a redirect unless the destination has its own (the old
    // in-app service page, /my/explore/:id, is the one that adds ?service=)
    expect(redirects.filter((r) => r.destination.startsWith("/my") && !r.source.startsWith("/my/")).every((r) => !r.destination.includes("?"))).toBe(true);
    expect(to("/my/explore/:id")?.destination).toBe("/my/explore?service=:id");
  });

  it("brings Xendit back to the app's pages", () => {
    const source = readFileSync("src/server/payments.ts", "utf8");
    expect(source).toContain("/my/confirmation?appointment_id=");
    expect(source).toContain("failure_redirect_url: `${base}/my/book`");
  });
});
