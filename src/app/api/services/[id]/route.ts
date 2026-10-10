import { isAdmin } from "@/server/auth";
import { getService } from "@/server/catalog";
import { deleteService, updateService } from "@/server/handlers/catalog";
import { toId } from "@/server/http";
import { forwardToWorker, ported } from "@/server/worker";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

const notFound = () => Response.json({ message: "Service not found" }, { status: 404 });

export const GET = ported<Context>(async (req, { params }) => {
  const { id } = await params;
  // Only numeric ids are services (e.g. /services/reorder is a Worker route)
  if (!/^\d+$/.test(id)) return forwardToWorker(req);
  const serviceId = toId(id);
  if (serviceId === null) return notFound();
  const service = await getService(serviceId, await isAdmin());
  return service ? Response.json(service) : notFound();
});

export const PUT = updateService;
export const DELETE = deleteService;
