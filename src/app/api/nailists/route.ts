import { getNailists } from "@/server/catalog";
import { createNailist } from "@/server/handlers/nailists";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

export const GET = ported(async () => Response.json(await getNailists()));

export const POST = createNailist;
