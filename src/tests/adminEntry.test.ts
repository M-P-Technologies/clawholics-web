import { describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

// The admin layout reads the session on the server; only its metadata export is under test here
vi.mock("@clerk/nextjs/server", () => ({ currentUser: vi.fn() }));
vi.mock("@/server/auth", () => ({ isAdmin: vi.fn() }));
vi.mock("@/server/worker", () => ({ nextApiEnabled: () => false }));

describe("/admin entry point", () => {
  it("sends an admin on to the dashboard", async () => {
    const { default: AdminEntry } = await import("@/app/(admin)/admin/page");
    AdminEntry();
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});

describe("keeping the admin screens out of search engines", () => {
  it("the admin layout marks every admin page noindex", async () => {
    const { metadata } = await import("@/app/(admin)/layout");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("robots.txt disallows /admin and every admin screen, and allows the public site", async () => {
    const { default: robots } = await import("@/app/robots");
    const rules = robots().rules as { userAgent: string; allow: string; disallow: string[] };
    expect(rules.allow).toBe("/");
    for (const path of [
      "/admin", "/dashboard", "/sales", "/performance", "/admin-directory", "/admin-scanner", "/clients", "/schedule",
      "/homepage", "/nail-services", "/nail-artists", "/about-us", "/contact-info", "/faqs", "/terms-and-conditions", "/privacy-policy",
    ]) {
      expect(rules.disallow).toContain(path);
    }
  });

  it("robots.txt does not block any public page", async () => {
    const { default: robots } = await import("@/app/robots");
    const rules = robots().rules as { disallow: string[] };
    for (const publicPath of ["/", "/about", "/contact", "/services", "/artists", "/terms", "/privacy", "/tou", "/booking", "/profile", "/login"]) {
      const blocked = rules.disallow.some((rule) => publicPath.startsWith(rule));
      expect(blocked, publicPath).toBe(false);
    }
  });
});
