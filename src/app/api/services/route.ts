import { isAdmin } from "@/server/auth";
import { getServices } from "@/server/catalog";
import { createService } from "@/server/handlers/catalog";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

// Public visitors only see active services in an active (or no) category
export const GET = ported(async () => Response.json(await getServices(await isAdmin())));

export const POST = createService;
