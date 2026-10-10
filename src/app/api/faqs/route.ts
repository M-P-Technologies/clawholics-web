import { getFaqs } from "@/server/catalog";
import { createFaq } from "@/server/handlers/catalog";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

export const GET = ported(async () => Response.json(await getFaqs()));

export const POST = createFaq;
