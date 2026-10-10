import { getCarousel } from "@/server/catalog";
import { updateCarousel } from "@/server/handlers/catalog";
import { ported } from "@/server/worker";

export const dynamic = "force-dynamic";

export const GET = ported(async () => Response.json(await getCarousel()));

export const PUT = updateCarousel;
