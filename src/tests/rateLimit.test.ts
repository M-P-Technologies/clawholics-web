import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { clientIp, rateLimited, resetRateLimits } from "@/server/rateLimit";

const request = (method: string, path: string, ip = "203.0.113.7") =>
  new Request(`https://clawholicsbymax.com${path}`, { method, headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });

describe("rate limits", () => {
  beforeEach(() => resetRateLimits());

  it("reads the visitor's address from the first x-forwarded-for entry", () => {
    expect(clientIp(request("GET", "/api/faqs", "198.51.100.4"))).toBe("198.51.100.4");
    expect(clientIp(new Request("https://x/api/faqs", { headers: { "x-real-ip": "192.0.2.9" } }))).toBe("192.0.2.9");
  });

  it("allows 5 contact messages per visitor in 10 minutes, then answers 429 with Retry-After", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) expect(rateLimited(request("POST", "/api/submit"), now + i, true)).toBeNull();
    const blocked = rateLimited(request("POST", "/api/submit"), now + 10, true);
    expect(blocked?.status).toBe(429);
    expect(Number(blocked?.headers.get("Retry-After"))).toBeGreaterThan(0);
    // Another visitor isn't affected, and the first can send again once the window has passed
    expect(rateLimited(request("POST", "/api/submit", "198.51.100.1"), now + 10, true)).toBeNull();
    expect(rateLimited(request("POST", "/api/submit"), now + 10 * 60_000 + 1, true)).toBeNull();
  });

  it("caps every request at 300 a minute per visitor", () => {
    const now = 5_000_000;
    for (let i = 0; i < 300; i++) expect(rateLimited(request("GET", "/api/faqs"), now, true)).toBeNull();
    expect(rateLimited(request("GET", "/api/services"), now, true)?.status).toBe(429);
  });

  it("never limits the Xendit webhook or the cron run", () => {
    const now = 9_000_000;
    for (let i = 0; i < 400; i++) expect(rateLimited(request("POST", "/api/payment/webhook"), now, true)).toBeNull();
  });

  it("is off under the test runner unless turned on", () => {
    for (let i = 0; i < 10; i++) expect(rateLimited(request("POST", "/api/submit"))).toBeNull();
  });
});
