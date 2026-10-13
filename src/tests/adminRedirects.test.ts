// @vitest-environment node
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("old admin addresses", () => {
  it("send the Client Directory and Appointments screens to Clients & Bookings", async () => {
    const redirects = await nextConfig.redirects!();
    const to = (source: string) => redirects.find((r) => r.source === source)?.destination;
    expect(to("/client-directory")).toBe("/clients");
    expect(to("/appointments")).toBe("/clients");
    // Straight there, not through another redirect
    expect(to("/AS_ClientDirectory")).toBe("/clients");
    expect(to("/AS_Appointments")).toBe("/clients");
    const sources = new Set(redirects.map((r) => r.source));
    expect(redirects.filter((r) => sources.has(r.destination))).toEqual([]);
  });
});
