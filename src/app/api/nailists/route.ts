import { publicReads } from "@/server/publicCache";
import { createNailist } from "@/server/handlers/nailists";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

export const GET = ported(async () => Response.json(await publicReads.nailists()));

export const POST = createNailist;
