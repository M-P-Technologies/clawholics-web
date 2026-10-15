import { publicReads } from "@/server/publicCache";
import { addGalleryImage } from "@/server/handlers/catalog";
import { toId } from "@/server/http";
import { forwardToWorker, ported } from "@/server/worker";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = ported<Context>(async (req, { params }) => {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return forwardToWorker(req);
  const serviceId = toId(id);
  return Response.json(serviceId === null ? [] : await publicReads.serviceGallery(serviceId));
});

export const POST = addGalleryImage;
