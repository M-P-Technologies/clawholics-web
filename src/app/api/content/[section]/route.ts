import { getContent, isContentSection } from "@/server/catalog";
import { updateContent } from "@/server/handlers/catalog";
import { forwardToWorker, ported } from "@/server/worker";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ section: string }> };

export const GET = ported<Context>(async (req, { params }) => {
  const { section } = await params;
  // Unknown sections get the Worker's answer (its 404)
  if (!isContentSection(section)) return forwardToWorker(req);
  return Response.json(await getContent(section));
});

export const PUT = updateContent;
