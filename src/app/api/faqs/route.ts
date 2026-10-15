import { publicReads } from "@/server/publicCache";
import { createFaq } from "@/server/handlers/catalog";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

export const GET = ported(async () => Response.json(await publicReads.faqs()));

export const POST = createFaq;
