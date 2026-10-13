import { publicReads } from "@/server/publicCache";
import { createTac } from "@/server/handlers/catalog";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

export const GET = ported(async () => Response.json(await publicReads.tacs()));

export const POST = createTac;
