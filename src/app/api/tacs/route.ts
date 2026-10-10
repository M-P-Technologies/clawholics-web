import { getTacs } from "@/server/catalog";
import { createTac } from "@/server/handlers/catalog";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

export const GET = ported(async () => Response.json(await getTacs()));

export const POST = createTac;
