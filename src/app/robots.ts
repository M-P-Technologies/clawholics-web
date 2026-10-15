import type { MetadataRoute } from "next";
import { NAV_GROUPS } from "@/components/features/admin/shell/adminNav";

// The public site may be crawled; the admin screens and the client app may not (they also say
// noindex themselves).
// A rule matches every path that starts with it, so "/admin" also covers /admin-directory.
const ADMIN_PATHS = ["/admin", ...NAV_GROUPS.flatMap((group) => group.items.map((item) => item.path))];

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: [...ADMIN_PATHS, "/design-system", "/my"] } };
}
