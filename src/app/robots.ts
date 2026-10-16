import type { MetadataRoute } from "next";
import { NAV_GROUPS } from "@/components/features/admin/shell/adminNav";
import { SITE_URL } from "@/lib/seo";

// The public site may be crawled; the admin screens, the client app and the API may not (the
// screens also say noindex themselves). The account pages (login, sign-up, onboarding) stay
// crawlable so their noindex tag is read.
// A rule matches every path that starts with it, so "/admin" also covers /admin-directory; keep
// admin paths from being the start of a public page's path.
const ADMIN_PATHS = ["/admin", ...NAV_GROUPS.flatMap((group) => group.items.map((item) => item.path))];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...ADMIN_PATHS, "/design-system", "/my", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
