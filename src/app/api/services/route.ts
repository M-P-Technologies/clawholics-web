import { isAdmin } from "@/server/auth";
import { getServices } from "@/server/catalog";
import { publicReads } from "@/server/publicCache";
import { createService } from "@/server/handlers/catalog";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

// Public visitors only see active services in an active (or no) category, from the cache;
// admins see them all, read fresh
export const GET = ported(async () =>
  Response.json((await isAdmin()) ? await getServices(true) : await publicReads.services()),
);

export const POST = createService;
